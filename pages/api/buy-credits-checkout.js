import { stripe } from '../../utils/initStripe';
import { supabaseAdmin } from '../../utils/initSupabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const {
    success_url,
    cancel_url,
    price_id,
    user_id,
    user_email,
    token_type,
    token_amount
  } = req.body;

  // Validate required fields
  if (!price_id || !user_id || !token_type || !token_amount) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['price_id', 'user_id', 'token_type', 'token_amount']
    });
  }

  // Validate token_type
  const validTokenTypes = ['image_tokens', 'video_tokens', 'caption_tokens'];
  if (!validTokenTypes.includes(token_type)) {
    return res.status(400).json({
      error: 'Invalid token_type',
      validTypes: validTokenTypes
    });
  }

  try {
    // 1) Resolve or create the Stripe customer
    let stripeCustomerId = null;

    const { data: row } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id, id')
      .eq('id', user_id)
      .single();

    if (row?.stripe_customer_id) {
      stripeCustomerId = row.stripe_customer_id;
    } else {
      // Try to find an existing Stripe customer by email
      let foundId = null;
      if (user_email) {
        const search = await stripe.customers.search({
          query: `email:"${user_email}"`
        });
        foundId = search.data?.[0]?.id || null;
      }

      // Create if not found
      if (!foundId) {
        const created = await stripe.customers.create({
          email: user_email || undefined,
          metadata: { supabaseUUID: user_id }
        });
        foundId = created.id;
      }

      // Persist canonical ID
      await supabaseAdmin.from('customers').upsert({
        id: user_id,
        stripe_customer_id: foundId
      });

      stripeCustomerId = foundId;
    }

    // 2) Build Checkout payload for one-time payment
    const payload = {
      success_url,
      cancel_url,
      client_reference_id: user_id,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: 'payment', // One-time payment, not subscription
      allow_promotion_codes: true,
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      customer: stripeCustomerId,
      metadata: {
        supabaseUUID: user_id,
        token_type: token_type, // 'image_tokens', 'video_tokens', or 'caption_tokens'
        token_amount: token_amount.toString() // Amount of tokens to add
      }
    };

    // 3) Create checkout session with idempotency key
    const idemKey = `chk_credits_${user_id}_${price_id}_${Date.now()}`;

    const session = await stripe.checkout.sessions.create(payload, {
      idempotencyKey: idemKey
    });

    console.log('✅ Credit checkout session created:', {
      sessionId: session.id,
      customer: stripeCustomerId,
      tokenType: token_type,
      tokenAmount: token_amount
    });

    return res.json(session);
  } catch (error) {
    console.error('Credit purchase checkout error:', error);
    return res.status(500).json({
      message: error.message || 'Failed to create credit purchase checkout',
      error: error.toString()
    });
  }
}
