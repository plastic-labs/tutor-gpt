'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation'

import { createCheckoutSession, createStripePortal } from '@/utils/stripe/actions';
import { SubscriptionStatus } from '@/utils/types';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Props {
  subStatus: SubscriptionStatus;
}

export default function SubscriptionManager({ subStatus }: Props) {
  const [loading, setLoading] = useState(false);

  const router = useRouter()

  const handleSubscription = async () => {
    setLoading(true);
    try {
      // TODO use price_ids based on a fixture
      const session = await createCheckoutSession("price_1PzJaKGhsOL14iteeuZBzLpg");
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({ sessionId: session.id });
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const url: string = await createStripePortal();
      // const stripe = await stripePromise;
      console.log(url)
      router.push(url);
      // await stripe?.redirectToCheckout({ sessionId: session.id });
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  }

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-2">Subscription Status</h2>
      <p className="mb-4">
        {subStatus === SubscriptionStatus.UNSUBSCRIBED ? 'No Active Subscription' : 'Active Subscription'}
      </p>
      <button
        // onClick={subStatus === SubscriptionStatus.UNSUBSCRIBED ? handleSubscription : handleManage}
        onClick={handleManage}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >

        {subStatus === SubscriptionStatus.UNSUBSCRIBED ? 'Subscribe Now' : 'Manage Subscription'}
      </button>
    </div>
  );
}
