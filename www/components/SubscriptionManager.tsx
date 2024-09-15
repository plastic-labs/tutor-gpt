'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function SubscriptionManager() {
  const [loading, setLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .single();
      setIsSubscribed(subscription?.status === 'active');
    }
  };

  const handleSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const session = await response.json();
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({ sessionId: session.id });
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-2">Subscription Status</h2>
      <p className="mb-4">
        {isSubscribed ? 'Active Subscription' : 'No Active Subscription'}
      </p>
      <button
        onClick={handleSubscription}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isSubscribed ? 'Manage Subscription' : 'Subscribe Now'}
      </button>
    </div>
  );
}