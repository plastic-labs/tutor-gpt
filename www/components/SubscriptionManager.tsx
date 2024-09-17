'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation'

import { createCheckoutSession, createPortalSession } from '@/utils/stripe/actions';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Props {
  isSubscribed: boolean;
}

export default function SubscriptionManager({ isSubscribed }: Props) {
  const [loading, setLoading] = useState(false);

  const router = useRouter()

  const handleSubscription = async () => {
    setLoading(true);
    try {
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
      const session = await createPortalSession();
      // const stripe = await stripePromise;
      console.log(session)
      router.push(session?.url);
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
        {isSubscribed ? 'Active Subscription' : 'No Active Subscription'}
      </p>
      <button
        onClick={isSubscribed ? handleManage : handleSubscription}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >

        {isSubscribed ? 'Manage Subscription' : 'Subscribe Now'}
      </button>
    </div>
  );
}
