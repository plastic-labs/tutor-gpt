import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';


const supabase = createAdminClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

async function updateSubscriptionStatus(userId: string, customerId: string, newStatus: string) {
  try {
    // First, check if the subscription exists
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('customer_id', customerId)
      .single()

    if (fetchError) throw fetchError

    if (!existingSubscription) {
      return false
    }

    // If the subscription exists, update the status
    const { data, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('customer_id', customerId)

    if (updateError) throw updateError

    console.log('Subscription updated successfully')
    return true

  } catch (error) {
    console.error('Error updating subscription:', error.message)
    return false
  }
}

export async function POST(req: Request) {
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

  // let result;

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.userId;
      await updateSubscriptionStatus(userId, subscription.customer, subscription.status)
      break;
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      const deletedUserId = deletedSubscription.metadata.userId;

      await updateSubscriptionStatus(deletedUserId, deletedSubscription.customer, deletedSubscription.status)
      break;
  }

  return NextResponse.json({ received: true });
}
