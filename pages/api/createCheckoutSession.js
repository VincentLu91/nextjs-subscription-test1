import { stripe } from '../../utils/initStripe';
import { supabaseAdmin } from '../../utils/initSupabaseAdmin';
import { createOrRetrieveCustomer } from '../../utils/useDatabase';
import { getURL } from '../../utils/helpers';

const createCheckoutSession = async (req, res) => {
  if (req.method === 'POST') {
    const token = req.headers.token;
    const { price, quantity = 1, metadata = {} } = req.body;

    try {
      const {
        data: { user },
        error
      } = await supabaseAdmin.auth.getUser(token);
      if (error) throw error;

      const customer = await createOrRetrieveCustomer({
        uuid: user.id,
        email: user.email
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        billing_address_collection: 'auto', // used to be 'required'
        customer,
        line_items: [
          {
            price,
            quantity
          }
        ],
        mode: 'subscription',
        metadata: {
          endorsely_referral: req.body.referral
        },
        allow_promotion_codes: true,
        /*subscription_data: { // I don't know what's the use of this.
          trial_from_plan: true, // todo is this ok?
          metadata
        },*/
        // use this instead...from docs
        // https://docs.stripe.com/billing/subscriptions/trials#configure-free-trials-without-payment-methods-to-cancel
        subscription_data: {
          trial_settings: {
            end_behavior: {
              missing_payment_method: 'pause'
            }
          }
          //trial_period_days: 15 //15 days of free trial, or comment this line if no trial
        },
        //payment_method_collection: 'if_required',
        payment_method_collection: 'always',
        success_url: `${getURL()}/account`,
        cancel_url: `${getURL()}/`
      });
      console.log('session57==============', session);

      return res.status(200).json({ sessionId: session.id, url: session.url });
    } catch (err) {
      console.log(err);
      res
        .status(500)
        .json({ error: { statusCode: 500, message: err.message } });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
};

export default createCheckoutSession;
