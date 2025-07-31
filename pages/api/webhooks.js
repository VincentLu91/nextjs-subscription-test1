import { stripe } from '../../utils/initStripe';
import {
  upsertProductRecord,
  upsertPriceRecord,
  manageSubscriptionStatusChange
} from '../../utils/useDatabase';
import getRawBody from 'raw-body';

// Stripe requires the raw body to construct the event.
export const config = {
  api: {
    bodyParser: false
  }
};

const buffer = (req) => {
  return new Promise((resolve, reject) => {
    const body = [];
    req
      .on('data', (chunk) => {
        body.push(chunk);
      })
      .on('end', () => {
        resolve(Buffer.concat(body));
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

// TODO: deleted events and tax rate events?
const relevantEvents = new Set([
  'product.created',
  'product.updated',
  'price.created',
  'price.updated',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end'
]);

const webhookHandler = async (req, res) => {
  if (req.method === 'POST') {
    //const buf = await buffer(req);
    const buf = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET_LIVE ??
      process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
      console.log('Received webhook event:', {
        type: event.type,
        id: event.id
      });
    } catch (err) {
      console.log(`❌ Webhook signature verification failed:`, {
        error: err.message,
        signature: sig,
        hasSecret: !!webhookSecret
      });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (relevantEvents.has(event.type)) {
      try {
        switch (event.type) {
          case 'product.created':
          case 'product.updated':
            await upsertProductRecord(event.data.object);
            break;
          case 'price.created':
          case 'price.updated':
            await upsertPriceRecord(event.data.object);
            break;
          case 'invoice.paid':
            console.log('event.data.object is: ', event.data.object);
            break;
          case 'customer.subscription.created':
          case 'customer.subscription.updated':
          case 'customer.subscription.deleted':
            const subscriptionEvent = event.data.object;
            console.log(
              'Raw subscription event data:',
              JSON.stringify(subscriptionEvent, null, 2)
            );

            if (
              !subscriptionEvent ||
              !subscriptionEvent.id ||
              !subscriptionEvent.customer
            ) {
              console.error('Invalid subscription event data:', {
                hasEvent: !!subscriptionEvent,
                hasId: subscriptionEvent?.id,
                hasCustomer: subscriptionEvent?.customer
              });
              throw new Error('Invalid subscription event data');
            }

            console.log('Processing subscription event:', {
              type: event.type,
              subscriptionId: subscriptionEvent.id,
              customerId: subscriptionEvent.customer
            });

            try {
              // First verify the customer exists in Stripe
              const stripeCustomer = await stripe.customers.retrieve(
                subscriptionEvent.customer
              );
              if (!stripeCustomer) {
                throw new Error(
                  `No Stripe customer found for ID: ${subscriptionEvent.customer}`
                );
              }

              console.log('Found Stripe customer:', {
                id: stripeCustomer.id,
                metadata: stripeCustomer.metadata,
                email: stripeCustomer.email
              });

              await manageSubscriptionStatusChange(
                subscriptionEvent.id,
                subscriptionEvent.customer,
                event.type === 'customer.subscription.created'
              );
              console.log('Successfully processed subscription change');
            } catch (error) {
              console.error('Failed to process subscription:', {
                error: error.message,
                stack: error.stack,
                eventType: event.type,
                customerId: event.data.object.customer
              });
              throw error;
            }
            break;
          case 'checkout.session.completed':
            const checkoutSession = event.data.object;
            console.log('Processing checkout session:', {
              mode: checkoutSession.mode,
              customerId: checkoutSession.customer,
              subscriptionId: checkoutSession.subscription
            });
            if (checkoutSession.mode === 'subscription') {
              const subscriptionId = checkoutSession.subscription;
              try {
                await manageSubscriptionStatusChange(
                  subscriptionId,
                  checkoutSession.customer,
                  true
                );
                console.log('Successfully processed checkout subscription');
              } catch (error) {
                console.error('Failed to process checkout subscription:', {
                  error: error.message,
                  stack: error.stack,
                  customerId: checkoutSession.customer,
                  subscriptionId
                });
                throw error;
              }
            }
            break;
          case 'customer.subscription.trial_will_end':
            const trialEndEvent = event.data.object;
            try {
              await manageSubscriptionStatusChange(
                trialEndEvent.id,
                trialEndEvent.customer,
                false,
                true // isTrialEnding flag
              );
              console.log('Successfully processed trial end notification');
            } catch (error) {
              console.error('Failed to process trial end:', {
                error: error.message,
                stack: error.stack,
                customerId: trialEndEvent.customer
              });
              throw error;
            }
            break;

          default:
            throw new Error('Unhandled relevant event!');
        }
      } catch (error) {
        console.log('Detailed webhook error:', {
          type: event.type,
          error: error.message,
          stack: error.stack
        });
        return res.status(500).json({
          error: 'Webhook handler failed',
          message: error.message,
          type: event.type
        });
      }
    }

    // Return a response to acknowledge receipt of the event.
    res.json({ received: true });
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
};

export default webhookHandler;
