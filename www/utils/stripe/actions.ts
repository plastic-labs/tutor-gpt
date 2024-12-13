'use server';

import { createClient } from '@/utils/supabase/server';
import { createOrRetrieveCustomer } from '@/utils/supabase/admin';

import {
  getURL,
  getErrorRedirect,
  calculateTrialEndUnixTimestamp,
} from '@/utils/helpers';

import Stripe from 'stripe';
//
import { Tables } from '@/utils/database.types';

type Price = Tables<'prices'>;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

type CheckoutResponse = {
  errorRedirect?: string;
  sessionId?: string;
};

export async function checkoutWithStripe(
  price: Price,
  redirectPath: string = '/settings'
): Promise<CheckoutResponse> {
  try {
    // Get the user from Supabase auth
    const supabase = createClient();
    const {
      error,
      data: { user },
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
        email: user?.email || '',
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
        address: 'auto',
      },
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      cancel_url: getURL(redirectPath),
      success_url: getURL(redirectPath),
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
          trial_end: calculateTrialEndUnixTimestamp(price.trial_period_days),
        },
      };
    } else if (price.type === 'one_time') {
      params = {
        ...params,
        mode: 'payment',
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
      console.log('It is working');
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
        ),
      };
    } else {
      return {
        errorRedirect: getErrorRedirect(
          redirectPath,
          'An unknown error occurred.',
          'Please try again later or contact a system administrator.'
        ),
      };
    }
  }
}

export async function createStripePortal() {
  try {
    const supabase = createClient();
    const {
      error,
      data: { user },
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
        email: user.email || '',
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
        return_url: getURL('/settings'),
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
