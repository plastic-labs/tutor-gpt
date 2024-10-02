// import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
// import { createAdminClient } from '@/utils/supabase/admin';
import {
  upsertProductRecord,
  upsertPriceRecord,
  manageSubscriptionStatusChange,
  deleteProductRecord,
  deletePriceRecord
} from '@/utils/supabase/admin';

// Stripe Webhook events we want to track and take action against
const relevantEvents = new Set([
  'product.created',
  'product.updated',
  'product.deleted',
  'price.created',
  'price.updated',
  'price.deleted',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted'
]);

// const supabase = createAdminClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// async function updateSubscriptionStatus(userId: string, customerId: string, newStatus: string) {
//   try {
//     // First, check if the subscription exists
//     const { data: existingSubscription, error: fetchError } = await supabase
//       .from('subscriptions')
//       .select('*')
//       .eq('user_id', userId)
//       .eq('customer_id', customerId)
//       .single()
//
//     if (fetchError) throw fetchError
//
//     if (!existingSubscription) {
//       return false
//     }
//
//     // If the subscription exists, update the status
//     const { data, error: updateError } = await supabase
//       .from('subscriptions')
//       .update({
//         status: newStatus,
//         updated_at: new Date().toISOString()
//       })
//       .eq('user_id', userId)
//       .eq('customer_id', customerId)
//
//     if (updateError) throw updateError
//
//     console.log('Subscription updated successfully')
//     return true
//
//   } catch (error) {
//     // console.error('Error updating subscription:', error.message)
//     return false
//   }
// }

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('Stripe-Signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      return new Response('Webhook secret not found.', { status: 400 });
    }
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err: any) {
    console.log('Webhook Error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    // return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'product.created':
        case 'product.updated':
          await upsertProductRecord(event.data.object as Stripe.Product);
          break;
        case 'price.created':
        case 'price.updated':
          await upsertPriceRecord(event.data.object as Stripe.Price);
          break;
        case 'price.deleted':
          await deletePriceRecord(event.data.object as Stripe.Price);
          break;
        case 'product.deleted':
          await deleteProductRecord(event.data.object as Stripe.Product);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            event.type === 'customer.subscription.created'
          );
          break;
        // case 'customer.subscription.created':
        // case 'customer.subscription.updated':
        //   const subscription = event.data.object as Stripe.Subscription;
        //   const userId = subscription.metadata.userId;
        //   await updateSubscriptionStatus(userId, subscription.customer, subscription.status)
        //   break;
        // case 'customer.subscription.deleted':
        //   const deletedSubscription = event.data.object as Stripe.Subscription;
        //   const deletedUserId = deletedSubscription.metadata.userId;
        //
        //   await updateSubscriptionStatus(deletedUserId, deletedSubscription.customer, deletedSubscription.status)
        //   break;
        case 'checkout.session.completed':
          const checkoutSession = event.data.object as Stripe.Checkout.Session
          if (checkoutSession.mode === 'subscription') {
            const subscriptionId = checkoutSession.subscription;
            manageSubscriptionStatusChange(
              subscriptionId as string,
              checkoutSession.customer as string,
              true
            )
          }
          break;
        default:
          throw new Error(`Unhandled relevant event type ${event.type}`)
      }
    } catch (error) {
      console.log(error);
      return new Response(
        'Webhook handler failed, view your Next.js function logs.',
        {
          status: 400
        }
      )
    }
  } else {
    return new Response(`Unhandled event type ${event.type}`, { status: 400 });
  }
  return new Response(JSON.stringify({ received: true }));
}
