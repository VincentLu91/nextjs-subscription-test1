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
    .insert([productData], { upsert: true });
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
    .insert([priceData], { upsert: true });
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

  if (error) {
    console.log('No existing customer found, creating new one');
    // No customer record found, let's create one.
    const customerData = {
      metadata: {
        supabaseUUID: uuid
      }
    };
    if (email) customerData.email = email;

    const customer = await stripe.customers.create(customerData);
    console.log('Created Stripe customer:', customer.id);

    // Now insert the customer ID into our Supabase mapping table.
    const { error: supabaseError } = await supabaseAdmin
      .from('customers')
      .insert([
        {
          id: uuid,
          stripe_customer_id: customer.id,
          image_tokens: 0,
          training_tokens: 0,
          caption_tokens: 0,
          video_tokens: 0
        }
      ]);

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
  createAction = false
) => {
  // Get customer's UUID from mapping table.
  console.log('Looking up customer with Stripe ID:', customerId);

  // First get the Stripe customer to get the Supabase UUID
  const stripeCustomer = await stripe.customers.retrieve(customerId);
  console.log('Retrieved Stripe customer:', {
    id: stripeCustomer.id,
    metadata: stripeCustomer.metadata
  });

  if (!stripeCustomer.metadata?.supabaseUUID) {
    console.error('Stripe customer has no Supabase UUID in metadata');
    throw new Error('Stripe customer missing Supabase UUID in metadata');
  }

  const supabaseUUID = stripeCustomer.metadata.supabaseUUID;

  // Now look up the customer in Supabase using the UUID from Stripe metadata
  const { data: customer, error: queryError } = await supabaseAdmin
    .from('customers')
    .select('id, image_tokens, training_tokens, caption_tokens, video_tokens')
    .eq('id', supabaseUUID)
    .single();

  if (queryError) {
    console.log('Customer lookup error:', queryError);
    throw queryError;
  }

  if (!customer) {
    console.log('Creating new customer record with UUID:', supabaseUUID);
    const { data: newCustomer, error: insertError } = await supabaseAdmin
      .from('customers')
      .insert({
        id: supabaseUUID,
        stripe_customer_id: customerId,
        image_tokens: 0,
        training_tokens: 0,
        caption_tokens: 0,
        video_tokens: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create customer:', insertError);
      throw insertError;
    }
    console.log('Created new customer:', newCustomer);
    return newCustomer;
  }

  console.log('Found existing customer:', customer);

  const {
    id: uuid,
    image_tokens,
    training_tokens,
    caption_tokens,
    video_tokens
  } = customer;

  console.log('Using customer data:', {
    uuid,
    image_tokens,
    training_tokens,
    caption_tokens,
    video_tokens
  });

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method']
  });
  // Upsert the latest status of the subscription object.
  const subscriptionData = {
    id: subscription.id,
    user_id: uuid,
    metadata: subscription.metadata,
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
    throw error;
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
  const {
    data: { price_id },
    error: noPriceDataError
  } = await supabaseAdmin
    .from('subscriptions')
    .select('price_id')
    .eq('user_id', customerId)
    .or('status.eq.active,status.eq.trialing')
    .single();

  if (noPriceDataError) return false;

  console.log(`price_id: `, price_id);

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
    data: { [typeOfToken]: tokens }, // Use computed property to select the token based on typeOfToken
    error: noPriceError
  } = await supabaseAdmin
    .from('prices')
    .select('id, ' + typeOfToken) // Select the token based on typeOfToken
    .eq('id', price_id)
    .single();

  if (noPriceError) return false;

  console.log(`tiered${typeOfToken}: `, tokens.data);
  return tokens;
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
  getTieredTokens
};
