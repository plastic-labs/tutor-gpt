import { createClient } from '@supabase/supabase-js';

// Note: supabaseAdmin uses the SERVICE_ROLE_KEY which you must only use in a secure server-side context
// as it has admin privileges and overwrites RLS policies!
// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL || '',
//   process.env.SUPABASE_SERVICE_ROLE_KEY || ''
// );

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

// const manageSubscriptionStatusChange = async (
//   subscriptionId: string,
//   customerId: string,
//   createAction = false
// ) => {
//   // Get customer's UUID from mapping table.
//   const { data: customerData, error: noCustomerError } = await supabaseAdmin
//     .from('subscriptions')
//     .select('user_id')
//     .eq('customer_id', customerId)
//     .single();
//
//   if (noCustomerError)
//     throw new Error(`Customer lookup failed: ${noCustomerError.message}`);
//
//   const { user_id: uuid } = customerData!;
//
//   const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
//     expand: ['default_payment_method']
//   });
//   // Upsert the latest status of the subscription object.
//   const subscriptionData: TablesInsert<'subscriptions'> = {
//     id: subscription.id,
//     user_id: uuid,
//     metadata: subscription.metadata,
//     status: subscription.status,
//     price_id: subscription.items.data[0].price.id,
//     //TODO check quantity on subscription
//     // @ts-ignore
//     quantity: subscription.quantity,
//     cancel_at_period_end: subscription.cancel_at_period_end,
//     cancel_at: subscription.cancel_at
//       ? toDateTime(subscription.cancel_at).toISOString()
//       : null,
//     canceled_at: subscription.canceled_at
//       ? toDateTime(subscription.canceled_at).toISOString()
//       : null,
//     current_period_start: toDateTime(
//       subscription.current_period_start
//     ).toISOString(),
//     current_period_end: toDateTime(
//       subscription.current_period_end
//     ).toISOString(),
//     created: toDateTime(subscription.created).toISOString(),
//     ended_at: subscription.ended_at
//       ? toDateTime(subscription.ended_at).toISOString()
//       : null,
//     trial_start: subscription.trial_start
//       ? toDateTime(subscription.trial_start).toISOString()
//       : null,
//     trial_end: subscription.trial_end
//       ? toDateTime(subscription.trial_end).toISOString()
//       : null
//   };
//
//   const { error: upsertError } = await supabaseAdmin
//     .from('subscriptions')
//     .upsert([subscriptionData]);
//   if (upsertError)
//     throw new Error(`Subscription insert/update failed: ${upsertError.message}`);
//   console.log(
//     `Inserted/updated subscription [${subscription.id}] for user [${uuid}]`
//   );
//
//   // For a new subscription copy the billing details to the customer object.
//   // NOTE: This is a costly operation and should happen at the very end.
//   if (createAction && subscription.default_payment_method && uuid)
//     //@ts-ignore
//     await copyBillingDetailsToCustomer(
//       uuid,
//       subscription.default_payment_method as Stripe.PaymentMethod
//     );
// };

// export {
//   manageSubscriptionStatusChange
// }

