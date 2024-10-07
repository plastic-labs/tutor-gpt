'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation'

import { createStripePortal } from '@/utils/stripe/actions';
import { Tables } from '@/utils/database.types';

import PriceCard from '@/components/PriceCard';
type Subscription = Tables<'subscriptions'>;
type Product = Tables<'products'>;
type Price = Tables<'prices'>;

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Props {
  subscription: Subscription | null;
  products: Product[];
}

export default function SubscriptionManager({ subscription, products }: Props) {
  const [loading, setLoading] = useState(false);

  const router = useRouter()

  console.log(products)

  const handleSubscription = async () => {
    setLoading(true);
    try {
      // TODO use price_ids based on a fixture
      // const session = await createCheckoutSession("price_1PzJaKGhsOL14iteeuZBzLpg");
      // const stripe = await stripePromise;
      // await stripe?.redirectToCheckout({ sessionId: session.id });
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
        {subscription ? 'Active Subscription' : 'No Active Subscription'}
      </p>
      {subscription ?
        (
          <button
            onClick={subscription ? handleManage : handleSubscription}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >

            {subscription ? 'Manage Subscription' : 'Subscribe Now'}
          </button>
        ) : (
          <div className="flex flex-row gap-3">
            {
              products[0]?.prices.map((price: Price, idx: number) => (
                <PriceCard key={idx} price={price} />
              ))
            }
          </div>
        )
      }


    </div >
  );
}
