'use server'

import { createClient } from '@/utils/supabase/server'
import Stripe from 'stripe'

import { SubscriptionStatus } from '@/utils/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

async function createAndLinkStripeCustomer() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  try {

    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user.id
      }
    })

    // TODO use the subscriptions table
    // Upsert to subscriptions table entry for user's customer_id
    // use existing subscription if it exists 

    await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        customer_id: customer.id,
        status: 'inactive'
      })

    return customer.id

    // await supabase
    //   .from('users')
    //   .update({ customer_id: customer.id })
    //   .eq('id', user.id)

  } catch (err) {
    console.error('Error in Creating Stripe Customer', err)
    throw err
  }
}

export async function checkSubscription(): Promise<SubscriptionStatus> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();
    if (subscription) {
      switch (subscription?.status) {
        case 'active':
        case 'trialing':
          return SubscriptionStatus.SUBSCRIBED
        case 'incomplete':
        case 'trialing':
        case 'past_due':
        case 'unpaid':
        case 'paused':
          return SubscriptionStatus.PENDING
        default:
          return SubscriptionStatus.UNSUBSCRIBED
      }
    } else {
      return SubscriptionStatus.UNSUBSCRIBED
    }
  }
  return SubscriptionStatus.UNSUBSCRIBED
};

export async function checkSubscriptionExists(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();
    if (subscription) {
      switch (subscription?.status) {
        case 'canceled':
        case 'trialing':
          return true
        default:
          return false
      }
    } else {
      await createAndLinkStripeCustomer()
      return false
    }
  }
  return false
};

export async function createCheckoutSession(price_id: string): Promise<any> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // if (!user) {
  //   return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  // }

  if (!user) {
    return
  }

  let customer_id

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('customer_id')
    .eq('user_id', user.id)
    .single();

  if (!subscription) {
    customer_id = await createAndLinkStripeCustomer()
  } else {
    customer_id = subscription?.customer_id
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer: customer_id,
    line_items: [
      {
        price: price_id,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_URL}/subscription?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/subscription?canceled=true`,
    client_reference_id: user.id,
    subscription_data: {
      metadata: {
        userId: user.id,
      },
    },
  });


  return session;
}

export async function createPortalSession() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return
  }

  let customer_id

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('customer_id')
    .eq('user_id', user.id)
    .single();

  if (!subscription) {
    customer_id = await createAndLinkStripeCustomer()
  } else {
    customer_id = subscription?.customer_id
  }
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customer_id,
    return_url: `${process.env.NEXT_PUBLIC_URL}/subscription`,
  });

  return portalSession;
}
