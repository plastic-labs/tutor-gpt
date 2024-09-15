import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  console.log('Webhook received'); 

  const body = await req.text();
  const signature = headers().get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.log('Webhook Error:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const supabase = createClient();

//   if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
//     const subscription = event.data.object as Stripe.Subscription;
//     const userId = subscription.metadata.userId;

//     await supabase.rpc('update_user_subscription', {
//       p_user_id: userId,
//       p_stripe_customer_id: subscription.customer as string,
//       p_stripe_subscription_id: subscription.id,
//       p_is_subscribed: subscription.status === 'active'
//     });
//   }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.userId;
      console.log('Subscription:', subscription);
      console.log('User ID:', userId);
      await supabase.rpc('update_subscription_status', {
        p_user_id: userId,
        p_status: subscription.status,
      });
      break;
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      const deletedUserId = deletedSubscription.metadata.userId;
      console.log('Deleted Subscription:', deletedSubscription);
      console.log('Deleted User ID:', deletedUserId);
      await supabase.rpc('update_subscription_status', {
        p_user_id: deletedUserId,
        p_status: 'canceled',
      });
      break;
  }

  return NextResponse.json({ received: true });
}