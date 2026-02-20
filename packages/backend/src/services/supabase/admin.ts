import { createClient } from '@supabase/supabase-js';
import { toDateTime } from '../../lib/helpers.js';
import { env } from '../../lib/env.js';
import type { Database, TablesInsert, Tables } from '@bloom/shared/types';
import Stripe from 'stripe';

type Product = Tables<'products'>;
type Price = Tables<'prices'>;

const TRIAL_PERIOD_DAYS = 0;
export const FREE_MESSAGE_LIMIT = 10;

let stripe: Stripe | null = null;
if (env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-01-27.acacia',
  });
}

export const supabaseAdmin = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

export async function createFreeTrialSubscription(userId: string) {
  const subscriptionData: TablesInsert<'subscriptions'> = {
    id: `free_trial_${userId}`,
    user_id: userId,
    status: 'trialing',
    metadata: { freeMessages: FREE_MESSAGE_LIMIT },
    price_id: null,
    quantity: 1,
    cancel_at_period_end: false,
    created: new Date().toISOString(),
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', ''),
    trial_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', ''),
  };

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .insert([subscriptionData]);

  if (error) {
    throw new Error(`Trial subscription creation failed: ${error.message}`);
  }

  return subscriptionData;
}

export async function decrementFreeMessages(userId: string) {
  const { data: subscription, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'trialing')
    .single();

  if (subError) throw new Error(`Subscription lookup failed: ${subError.message}`);

  const currentCount =
    (subscription.metadata as { freeMessages: number })?.freeMessages ?? 0;
  if (currentCount <= 0) return false;

  const { error: updateError } = await supabaseAdmin
    .from('subscriptions')
    .update({ metadata: { freeMessages: currentCount - 1 } })
    .eq('id', subscription.id);

  if (updateError) throw new Error(`Free message update failed: ${updateError.message}`);
  return true;
}

export async function upsertProductRecord(product: Stripe.Product) {
  const productData: Product = {
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description ?? null,
    image: product.images?.[0] ?? null,
    metadata: product.metadata,
  };

  const { error } = await supabaseAdmin.from('products').upsert([productData]);
  if (error) throw new Error(`Product insert/update failed: ${error.message}`);
}

export async function upsertPriceRecord(
  price: Stripe.Price,
  retryCount = 0,
  maxRetries = 3
) {
  const priceData: Price = {
    id: price.id,
    product_id: typeof price.product === 'string' ? price.product : '',
    active: price.active,
    currency: price.currency,
    type: price.type,
    unit_amount: price.unit_amount ?? null,
    interval: price.recurring?.interval ?? null,
    interval_count: price.recurring?.interval_count ?? null,
    trial_period_days: price.recurring?.trial_period_days ?? TRIAL_PERIOD_DAYS,
    description: null,
    metadata: price.metadata ?? null,
  };

  const { error } = await supabaseAdmin.from('prices').upsert([priceData]);

  if (error?.message.includes('foreign key constraint')) {
    if (retryCount < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await upsertPriceRecord(price, retryCount + 1, maxRetries);
    } else {
      throw new Error(
        `Price insert/update failed after ${maxRetries} retries: ${error.message}`
      );
    }
  } else if (error) {
    throw new Error(`Price insert/update failed: ${error.message}`);
  }
}

export async function deleteProductRecord(product: Stripe.Product) {
  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', product.id);
  if (error) throw new Error(`Product deletion failed: ${error.message}`);
}

export async function deletePriceRecord(price: Stripe.Price) {
  const { error } = await supabaseAdmin
    .from('prices')
    .delete()
    .eq('id', price.id);
  if (error) throw new Error(`Price deletion failed: ${error.message}`);
}

async function upsertCustomerToSupabase(uuid: string, customerId: string) {
  const { error } = await supabaseAdmin
    .from('customers')
    .upsert([{ id: uuid, stripe_customer_id: customerId }]);
  if (error) throw new Error(`Supabase customer record creation failed: ${error.message}`);
  return customerId;
}

async function createCustomerInStripe(uuid: string, email: string) {
  if (!stripe) throw new Error('Stripe not configured');
  const newCustomer = await stripe.customers.create({
    metadata: { supabaseUUID: uuid },
    email,
  });
  if (!newCustomer) throw new Error('Stripe customer creation failed.');
  return newCustomer.id;
}

export async function createOrRetrieveCustomer({
  email,
  uuid,
}: {
  email: string;
  uuid: string;
}) {
  if (!stripe) throw new Error('Stripe not configured');

  const { data: existingCustomer, error: queryError } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('id', uuid)
    .maybeSingle();

  if (queryError) throw new Error(`Customer lookup failed: ${queryError.message}`);

  let stripeCustomerId: string | undefined;
  if (existingCustomer?.stripe_customer_id) {
    const existing = await stripe.customers.retrieve(existingCustomer.stripe_customer_id);
    stripeCustomerId = existing.id;
  } else {
    const stripeCustomers = await stripe.customers.list({ email });
    stripeCustomerId = stripeCustomers.data.length > 0 ? stripeCustomers.data[0].id : undefined;
  }

  const stripeIdToInsert = stripeCustomerId ?? (await createCustomerInStripe(uuid, email));

  if (existingCustomer && stripeCustomerId) {
    if (existingCustomer.stripe_customer_id !== stripeCustomerId) {
      await supabaseAdmin
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', uuid);
    }
    return stripeCustomerId;
  }

  return await upsertCustomerToSupabase(uuid, stripeIdToInsert);
}

async function copyBillingDetailsToCustomer(
  uuid: string,
  payment_method: Stripe.PaymentMethod
) {
  if (!stripe) return;
  const customer = payment_method.customer as string;
  const { name, phone, address } = payment_method.billing_details;
  if (!name || !phone || !address) return;
  // @ts-expect-error address type mismatch
  await stripe.customers.update(customer, { name, phone, address });
  await supabaseAdmin
    .from('users')
    .update({
      billing_address: { ...address },
      payment_method: { ...payment_method[payment_method.type] },
    })
    .eq('id', uuid);
}

export async function manageSubscriptionStatusChange(
  subscriptionId: string,
  customerId: string,
  createAction = false
) {
  if (!stripe) throw new Error('Stripe not configured');

  const { data: customerData, error } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error) throw new Error(`Customer lookup failed: ${error.message}`);

  const { id: uuid } = customerData!;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method'],
  });

  const subscriptionData: TablesInsert<'subscriptions'> = {
    id: subscription.id,
    user_id: uuid,
    metadata: subscription.metadata,
    status: subscription.status,
    price_id: subscription.items.data[0].price.id,
    // @ts-expect-error quantity may not exist
    quantity: subscription.quantity,
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at
      ? toDateTime(subscription.cancel_at).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? toDateTime(subscription.canceled_at).toISOString()
      : null,
    current_period_start: toDateTime(subscription.current_period_start).toISOString(),
    current_period_end: toDateTime(subscription.current_period_end).toISOString(),
    created: toDateTime(subscription.created).toISOString(),
    ended_at: subscription.ended_at
      ? toDateTime(subscription.ended_at).toISOString()
      : null,
    trial_start: subscription.trial_start
      ? toDateTime(subscription.trial_start).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? toDateTime(subscription.trial_end).toISOString()
      : null,
  };

  const { error: upsertError } = await supabaseAdmin
    .from('subscriptions')
    .upsert([subscriptionData], { onConflict: 'user_id' });

  if (upsertError) throw new Error(`Subscription insert/update failed: ${upsertError.message}`);

  if (createAction && subscription.default_payment_method && uuid) {
    await copyBillingDetailsToCustomer(
      uuid,
      subscription.default_payment_method as Stripe.PaymentMethod
    );
  }
}
