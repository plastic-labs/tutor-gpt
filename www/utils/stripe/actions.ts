'use server'

import { createClient } from '@/utils/supabase/server'
import { createOrRetrieveCustomer } from '@/utils/supabase/admin';

import { getURL, getErrorRedirect, calculateTrialEndUnixTimestamp } from '@/utils/helpers';

import Stripe from 'stripe'
// import { SubscriptionStatus } from '@/utils/types'
//
import { Tables } from '@/utils/database.types';

type Price = Tables<'prices'>;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

type CheckoutResponse = {
  errorRedirect?: string;
  sessionId?: string;
};

export async function checkoutWithStripe(
  price: Price,
  redirectPath: string = '/subscription',
): Promise<CheckoutResponse> {
  try {
    // Get the user from Supabase auth
    const supabase = createClient();
    const {
      error,
      data: { user }
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error(error);
      throw new Error('Could not get user session.');
    }

    // Retrieve or create the customer in Stripe
    let customer: string;
    try {
      customer = await createOrRetrieveCustomer({
        uuid: user?.id || '',
        email: user?.email || ''
      });
    } catch (err) {
      console.error(err);
      throw new Error('Unable to access customer record.');
    }

    let params: Stripe.Checkout.SessionCreateParams = {
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer,
      customer_update: {
        address: 'auto'
      },
      line_items: [
        {
          price: price.id,
          quantity: 1
        }
      ],
      cancel_url: getURL(),
      success_url: getURL(redirectPath)
    };

    console.log(
      'Trial end:',
      calculateTrialEndUnixTimestamp(price.trial_period_days)
    );

    if (price.type === 'recurring') {
      params = {
        ...params,
        mode: 'subscription',
        subscription_data: {
          trial_end: calculateTrialEndUnixTimestamp(price.trial_period_days)
        }
      };
    } else if (price.type === 'one_time') {
      params = {
        ...params,
        mode: 'payment'
      };
    }

    // Create a checkout session in Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.create(params);
    } catch (err) {
      console.error(err);
      throw new Error('Unable to create checkout session.');
    }

    // Instead of returning a Response, just return the data or error.
    if (session) {
      console.log("It is working")
      return { sessionId: session.id };
    } else {
      throw new Error('Unable to create checkout session.');
    }
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return {
        errorRedirect: getErrorRedirect(
          redirectPath,
          error.message,
          'Please try again later or contact a system administrator.'
        )
      };
    } else {
      return {
        errorRedirect: getErrorRedirect(
          redirectPath,
          'An unknown error occurred.',
          'Please try again later or contact a system administrator.'
        )
      };
    }
  }
}



// TODO 
// export async function createStripePortal(currentPath: string) {
export async function createStripePortal() {
  try {
    const supabase = createClient();
    const {
      error,
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      if (error) {
        console.error(error);
      }
      throw new Error('Could not get user session.');
    }

    let customer;
    try {
      customer = await createOrRetrieveCustomer({
        uuid: user.id || '',
        email: user.email || ''
      });
    } catch (err) {
      console.error(err);
      throw new Error('Unable to access customer record.');
    }

    if (!customer) {
      throw new Error('Could not get customer.');
    }

    try {
      const { url } = await stripe.billingPortal.sessions.create({
        customer,
        // TODO 
        // return_url: getURL('/account')
        return_url: `${process.env.NEXT_PUBLIC_URL}/subscription`,
      });
      if (!url) {
        throw new Error('Could not create billing portal');
      }
      return url;
    } catch (err) {
      console.error(err);
      throw new Error('Could not create billing portal');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      // TODO 
      // return getErrorRedirect(
      //   currentPath,
      //   error.message,
      //   'Please try again later or contact a system administrator.'
      // );
    } else {
      // TODO 
      // return getErrorRedirect(
      //   currentPath,
      //   'An unknown error occurred.',
      //   'Please try again later or contact a system administrator.'
      // );
    }
  }
}


// export async function createPortalSession() {
//   const supabase = createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) {
//     return
//   }
//
//   let customer_id
//
//   const { data: subscription } = await supabase
//     .from('subscriptions')
//     .select('customer_id')
//     .eq('user_id', user.id)
//     .single();
//
//   if (!subscription) {
//     customer_id = await createAndLinkStripeCustomer()
//   } else {
//     customer_id = subscription?.customer_id
//   }
//   const portalSession = await stripe.billingPortal.sessions.create({
//     customer: customer_id,
//     return_url: `${process.env.NEXT_PUBLIC_URL}/subscription`,
//   });
//
//   return portalSession;
// }

// async function createAndLinkStripeCustomer() {
//   const supabase = createClient()
//
//   const { data: { user } } = await supabase.auth.getUser()
//
//   if (!user) {
//     return
//   }
//
//   try {
//
//     const customer = await stripe.customers.create({
//       email: user.email,
//       metadata: {
//         userId: user.id
//       }
//     })
//
//     // TODO use the subscriptions table
//     // Upsert to subscriptions table entry for user's customer_id
//     // use existing subscription if it exists 
//
//     await supabase
//       .from('subscriptions')
//       .upsert({
//         user_id: user.id,
//         customer_id: customer.id,
//         status: 'inactive'
//       })
//
//     return customer.id
//
//     // await supabase
//     //   .from('users')
//     //   .update({ customer_id: customer.id })
//     //   .eq('id', user.id)
//
//   } catch (err) {
//     console.error('Error in Creating Stripe Customer', err)
//     throw err
//   }
// }
//
// export async function checkSubscriptionExists(): Promise<boolean> {
//   const supabase = createClient()
//   const { data: { user } } = await supabase.auth.getUser();
//   if (user) {
//     const { data: subscription } = await supabase
//       .from('subscriptions')
//       .select('status')
//       .eq('user_id', user.id)
//       .single();
//     if (subscription) {
//       switch (subscription?.status) {
//         case 'canceled':
//         case 'trialing':
//           return true
//         default:
//           return false
//       }
//     } else {
//       await createAndLinkStripeCustomer()
//       return false
//     }
//   }
//   return false
// };


// export async function checkSubscription(): Promise<SubscriptionStatus> {
//   const supabase = createClient()
//   const { data: { user } } = await supabase.auth.getUser();
//   if (user) {
//     const { data: subscription } = await supabase
//       .from('subscriptions')
//       .select('status')
//       .eq('user_id', user.id)
//       .single();
//     if (subscription) {
//       switch (subscription?.status) {
//         case 'active':
//         case 'trialing':
//           return SubscriptionStatus.SUBSCRIBED
//         case 'incomplete':
//         case 'trialing':
//         case 'past_due':
//         case 'unpaid':
//         case 'paused':
//           return SubscriptionStatus.PENDING
//         default:
//           return SubscriptionStatus.UNSUBSCRIBED
//       }
//     } else {
//       return SubscriptionStatus.UNSUBSCRIBED
//     }
//   }
//   return SubscriptionStatus.UNSUBSCRIBED
// };
//

// export async function createCheckoutSession(price_id: string): Promise<any> {
//   const supabase = createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//
//   // if (!user) {
//   //   return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
//   // }
//
//   if (!user) {
//     return
//   }
//
//   let customer_id
//
//   const { data: subscription } = await supabase
//     .from('subscriptions')
//     .select('customer_id')
//     .eq('user_id', user.id)
//     .single();
//
//   if (!subscription) {
//     customer_id = await createAndLinkStripeCustomer()
//   } else {
//     customer_id = subscription?.customer_id
//   }
//
//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     customer: customer_id,
//     line_items: [
//       {
//         price: price_id,
//         quantity: 1,
//       },
//     ],
//     mode: 'subscription',
//     success_url: `${process.env.NEXT_PUBLIC_URL}/subscription?success=true`,
//     cancel_url: `${process.env.NEXT_PUBLIC_URL}/subscription?canceled=true`,
//     client_reference_id: user.id,
//     subscription_data: {
//       metadata: {
//         userId: user.id,
//       },
//     },
//   });
//
//
//   return session;
// }
