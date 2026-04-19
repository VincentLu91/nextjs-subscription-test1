import { supabaseAdmin } from './initSupabaseAdmin';
import { stripe } from './initStripe';
import { toDateTime } from './helpers';

const upsertProductRecord = async (product) => {
  const productData = {
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description,
    image: product.images?.[0] ?? null,
    metadata: product.metadata
  };

  const { error } = await supabaseAdmin
    .from('products')
    .upsert(productData, { onConflict: 'id' }); // v2: real upsert
  if (error) throw error;
  console.log(`Product inserted/updated: ${product.id}`);
};

const upsertPriceRecord = async (price) => {
  const priceData = {
    id: price.id,
    product_id: price.product,
    active: price.active,
    currency: price.currency,
    description: price.nickname,
    type: price.type,
    unit_amount: price.unit_amount,
    interval: price.recurring?.interval ?? null,
    interval_count: price.recurring?.interval_count ?? null,
    trial_period_days: price.recurring?.trial_period_days ?? null,
    metadata: price.metadata
  };

  const { error } = await supabaseAdmin
    .from('prices')
    .upsert(priceData, { onConflict: 'id' }); // v2: real upsert
  if (error) throw error;
  console.log(`Price inserted/updated: ${price.id}`);
};

const createOrRetrieveCustomer = async ({ email, uuid }) => {
  console.log('Creating/retrieving customer for:', { email, uuid });

  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('stripe_customer_id')
    .eq('id', uuid)
    .single();

  if (error || !data || !data.stripe_customer_id) {
    console.log('No existing customer or stripe ID found, creating new one');
    // No customer record found, let's create one.
    const customerData = {
      metadata: {
        supabaseUUID: uuid
      }
    };
    if (email) customerData.email = email;

    const customer = await stripe.customers.create(customerData);
    console.log('Created Stripe customer:', customer.id);

    // Get existing customer data if any
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('image_tokens, training_tokens, caption_tokens, video_tokens')
      .eq('id', uuid)
      .single();

    // Now update or insert the customer ID into our Supabase mapping table
    const { error: supabaseError } = await supabaseAdmin
      .from('customers')
      .upsert({
        id: uuid,
        stripe_customer_id: customer.id,
        // Preserve existing token values or default to 0
        image_tokens: existingCustomer?.image_tokens || 0, // || instead of &&, 3 instead of 0
        training_tokens: existingCustomer?.training_tokens || 0,
        caption_tokens: existingCustomer?.caption_tokens || 0,
        video_tokens: existingCustomer?.video_tokens || 0
      });

    if (supabaseError) {
      console.error('Failed to create Supabase customer:', supabaseError);
      throw supabaseError;
    }

    console.log(`New customer created and inserted for ${uuid}`);
    return customer.id;
  }

  console.log('Found existing customer:', data.stripe_customer_id);
  return data.stripe_customer_id;
};

/**
 * Copies the billing details from the payment method to the customer object.
 */
const copyBillingDetailsToCustomer = async (uuid, payment_method) => {
  const customer = payment_method.customer;
  const { name, phone, address } = payment_method.billing_details;
  await stripe.customers.update(customer, { name, phone, address });
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      billing_address: address,
      payment_method: payment_method[payment_method.type]
    })
    .eq('id', uuid);
  if (error) throw error;
};

const manageSubscriptionStatusChange = async (
  subscriptionId,
  customerId,
  createAction = false,
  isTrialEnding = false
) => {
  // Get customer's UUID from mapping table.
  console.log('Looking up customer with Stripe ID:', customerId);

  // First get the Stripe customer to get the Supabase UUID
  const stripeCustomer = await stripe.customers.retrieve(customerId);
  console.log('Retrieved Stripe customer:', {
    id: stripeCustomer.id,
    metadata: stripeCustomer.metadata
  });

  // Get the subscription first to find any existing records
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method']
  });

  let supabaseUUID = stripeCustomer.metadata?.supabaseUUID;
  let customer = null;

  if (!supabaseUUID) {
    console.warn('Stripe customer has no Supabase UUID in metadata');

    // Try to find customer by stripe_customer_id
    const { data: customerByStripeId, error: stripeIdError } =
      await supabaseAdmin
        .from('customers')
        .select(
          'id, image_tokens, training_tokens, caption_tokens, video_tokens'
        )
        .eq('stripe_customer_id', customerId)
        .single();

    if (!stripeIdError && customerByStripeId) {
      customer = customerByStripeId;
      supabaseUUID = customerByStripeId.id;
      console.log('Found customer by Stripe ID:', customerByStripeId);
    } else {
      // If this is a deletion event, we'll just update the subscription status
      if (subscription.status === 'canceled') {
        console.log('Processing cancellation for unknown customer');
        // Continue with just subscription update
      } else {
        console.error('Unable to find customer record');
        throw new Error('Unable to find customer record');
      }
    }
  } else {
    // Look up the customer in Supabase using the UUID from Stripe metadata
    const { data: customerByUUID, error: queryError } = await supabaseAdmin
      .from('customers')
      .select('id, image_tokens, training_tokens, caption_tokens, video_tokens')
      .eq('id', supabaseUUID)
      .single();

    if (!queryError) {
      customer = customerByUUID;
    }
  }

  // If we found a customer, use their data
  let uuid = customer?.id || supabaseUUID;

  if (customer) {
    console.log('Using customer data:', {
      uuid: customer.id,
      image_tokens: customer.image_tokens,
      training_tokens: customer.training_tokens,
      caption_tokens: customer.caption_tokens,
      video_tokens: customer.video_tokens
    });
  }
  // Always update subscription status
  const subscriptionData = {
    id: subscription.id,
    user_id: uuid || null, // Allow null for unknown customers
    metadata: subscription.metadata,
    trial_ending: isTrialEnding,
    status: subscription.status,
    price_id: subscription.items.data[0].price.id,
    quantity: subscription.quantity,
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at
      ? toDateTime(subscription.cancel_at)
      : null,
    canceled_at: subscription.canceled_at
      ? toDateTime(subscription.canceled_at)
      : null,
    current_period_start: toDateTime(subscription.current_period_start),
    current_period_end: toDateTime(subscription.current_period_end),
    created: toDateTime(subscription.created),
    ended_at: subscription.ended_at ? toDateTime(subscription.ended_at) : null,
    trial_start: subscription.trial_start
      ? toDateTime(subscription.trial_start)
      : null,
    trial_end: subscription.trial_end
      ? toDateTime(subscription.trial_end)
      : null
  };

  // the commented code below was the original implementation of updating
  // subscriptions using Supabase's Javascript 1.0 SDK
  /*const { error } = await supabaseAdmin
    .from('subscriptions')
    .insert([subscriptionData], { upsert: true });*/

  // the code below replaces the code above, using the Javascript 2.0 SDK
  console.log('Upserting subscription data:', subscriptionData);
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(subscriptionData)
    .select();
  if (error) {
    console.log('Failed to upsert subscription:', error);
    // Don't throw error for cancellations
    if (subscription.status !== 'canceled') {
      throw error;
    }
  }
  console.log(
    `Inserted/updated subscription [${subscription.id}] for user [${uuid}]`
  );

  if (subscription.status == 'active') {
    const {
      data: {
        image_tokens: priceImageTokens,
        training_tokens: priceTrainTokens,
        caption_tokens: priceCaptionTokens,
        video_tokens: priceVideoTokens
      },
      error: noCustomerError
    } = await supabaseAdmin
      .from('prices')
      .select('image_tokens, training_tokens, caption_tokens, video_tokens')
      .eq('id', subscription.items.data[0].price.id)
      .single();

    let customerTokenUpdate = {
      id: uuid,
      //image_tokens: image_tokens + 30 // this is where `image_tokens` gets updated
      image_tokens: priceImageTokens, // each time the subscription is renewed, it resets the number of tokens as expected
      training_tokens: priceTrainTokens,
      caption_tokens: priceCaptionTokens,
      video_tokens: priceVideoTokens
    };

    await supabaseAdmin.from('customers').upsert(customerTokenUpdate).select();
  }

  // For a new subscription copy the billing details to the customer object.
  // NOTE: This is a costly operation and should happen at the very end.
  if (createAction && subscription.default_payment_method)
    await copyBillingDetailsToCustomer(
      uuid,
      subscription.default_payment_method
    );
};

const deductUserImageGenerationToken = async (customerId, tokensToDeduct) => {
  // Get customer's UUID from mapping table.
  const {
    data: { id: uuid, image_tokens },
    error: noCustomerError
  } = await supabaseAdmin
    .from('customers')
    .select('id,image_tokens')
    .eq('id', customerId)
    .single();
  if (noCustomerError) throw new Error(noCustomerError);

  if (image_tokens - tokensToDeduct >= 0) {
    let customerTokenUpdate = {
      id: uuid,
      image_tokens: image_tokens - tokensToDeduct
    };

    await supabaseAdmin.from('customers').upsert(customerTokenUpdate).select();
    return true;
  } else {
    return false;
  }
};

const deductUserVideoGenerationToken = async (customerId, tokensToDeduct) => {
  // Get customer's UUID from mapping table.
  // pivot from deducting number of videos generated to deducting based on duration of video,
  // e.g. 1 token for 5s, 2 tokens for 10s, etc.
  const {
    data: { id: uuid, video_tokens },
    error: noCustomerError
  } = await supabaseAdmin
    .from('customers')
    .select('id,video_tokens')
    .eq('id', customerId)
    .single();
  if (noCustomerError) throw new Error(noCustomerError);

  if (video_tokens - tokensToDeduct >= 0) {
    let customerTokenUpdate = {
      id: uuid,
      video_tokens: video_tokens - tokensToDeduct
    };

    await supabaseAdmin.from('customers').upsert(customerTokenUpdate).select();
    return true;
  } else {
    return false;
  }
};

const getTokens = async (customerId, typeOfToken) => {
  // Validate typeOfToken
  const validTokenTypes = [
    'image_tokens',
    'caption_tokens',
    'training_tokens',
    'video_tokens'
  ];
  if (!validTokenTypes.includes(typeOfToken)) {
    throw new Error(`Invalid typeOfToken: ${typeOfToken}`);
  }

  // Get customer's UUID from mapping table.
  const {
    data: { id: uuid, [typeOfToken]: tokens }, // Use computed property to select the token based on typeOfToken
    error: noCustomerError
  } = await supabaseAdmin
    .from('customers')
    .select('id, ' + typeOfToken) // Select the token based on typeOfToken
    .eq('id', customerId)
    .single();

  if (noCustomerError) return false;

  console.log(`get${typeOfToken}: `, tokens.data);
  return tokens;
};

const getTieredTokens = async (customerId, typeOfToken) => {
  // Validate typeOfToken
  const validTokenTypes = [
    'image_tokens',
    'caption_tokens',
    'training_tokens',
    'video_tokens'
  ];
  if (!validTokenTypes.includes(typeOfToken)) {
    throw new Error(`Invalid typeOfToken: ${typeOfToken}`);
  }

  // Check if user has an active subscription
  const { data: subscriptionData, error: noPriceDataError } =
    await supabaseAdmin
      .from('subscriptions')
      .select('price_id')
      .eq('user_id', customerId)
      .or('status.eq.active,status.eq.trialing')
      .single();

  // If no subscription or error, return free user allocation
  if (!subscriptionData || noPriceDataError) {
    // Return token allocation based on initializeFreeUser values
    switch (typeOfToken) {
      case 'image_tokens':
        return 6;
      case 'training_tokens':
        return 1;
      case 'caption_tokens':
        return 9;
      case 'video_tokens':
        return 3;
    }
  }

  // For paid users, get allocation from prices table
  const { data, error: noPriceError } = await supabaseAdmin
    .from('prices')
    .select(typeOfToken)
    .eq('id', subscriptionData.price_id)
    .single();

  if (noPriceError) return false;

  return data[typeOfToken];
};

const deductUserTrainingToken = async (customerId, tokensToDeduct) => {
  // Get customer's UUID from mapping table.
  const {
    data: { id: uuid, training_tokens },
    error: noCustomerError
  } = await supabaseAdmin
    .from('customers')
    .select('id,training_tokens')
    .eq('id', customerId)
    .single();
  if (noCustomerError) return false;

  if (training_tokens - tokensToDeduct >= 0) {
    let customerTokenUpdate = {
      id: uuid,
      training_tokens: training_tokens - tokensToDeduct
    };

    await supabaseAdmin.from('customers').upsert(customerTokenUpdate).select();
    return true;
  } else {
    return false;
  }
};

const deductUserCaptionToken = async (customerId, tokensToDeduct) => {
  // Get customer's UUID from mapping table.
  const {
    data: { id: uuid, caption_tokens },
    error: noCustomerError
  } = await supabaseAdmin
    .from('customers')
    .select('id,caption_tokens')
    .eq('id', customerId)
    .single();
  if (noCustomerError) return false;

  if (caption_tokens - tokensToDeduct >= 0) {
    let customerTokenUpdate = {
      id: uuid,
      caption_tokens: caption_tokens - tokensToDeduct
    };

    await supabaseAdmin.from('customers').upsert(customerTokenUpdate).select();
    return true;
  } else {
    return false;
  }
};

const addUserTokens = async (customerId, tokenType, tokensToAdd) => {
  // Validate token type
  const validTokenTypes = ['image_tokens', 'video_tokens', 'caption_tokens'];
  if (!validTokenTypes.includes(tokenType)) {
    console.error(`Invalid token type: ${tokenType}`);
    return false;
  }

  const { data: customer, error: noCustomerError } = await supabaseAdmin
    .from('customers')
    .select(`id, ${tokenType}`)
    .eq('id', customerId)
    .single();

  if (noCustomerError) {
    console.error('Error fetching customer:', noCustomerError);
    return false;
  }

  const currentTokens = customer[tokenType] || 0;
  const newTokens = currentTokens + tokensToAdd;

  let customerTokenUpdate = {
    id: customer.id,
    [tokenType]: newTokens
  };

  const { data, error } = await supabaseAdmin
    .from('customers')
    .upsert(customerTokenUpdate)
    .select();

  if (error) {
    console.error('Error updating tokens:', error);
    return false;
  }

  return {
    success: true,
    data: data,
    oldBalance: currentTokens,
    newBalance: newTokens
  };
};

export {
  upsertProductRecord,
  upsertPriceRecord,
  createOrRetrieveCustomer,
  manageSubscriptionStatusChange,
  deductUserImageGenerationToken,
  deductUserVideoGenerationToken,
  deductUserTrainingToken,
  deductUserCaptionToken,
  getTokens,
  getTieredTokens,
  addUserTokens
};
