'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'

import { createStripePortal } from '@/utils/stripe/actions';
import { Tables } from '@/utils/database.types';

import PriceCard from '@/components/PriceCard';
type Subscription = Tables<'subscriptions'>;
type Product = Tables<'products'>;
type Price = Tables<'prices'>;

interface Props {
  subscription: Subscription | null;
  products: any[] | null;
}

export default function SubscriptionManager({ subscription, products }: Props) {
  const [loading, setLoading] = useState(false);

  const prices = products?.[0]?.prices ?? [];

  const router = useRouter()

  const handleManage = async () => {
    setLoading(true);
    try {
      const url = await createStripePortal();

      if (url) {
        console.log(url)
        router.push(url);
      }
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
            onClick={handleManage}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Manage Subscription
          </button>
        ) : (
          <div className="flex flex-row gap-3">
            {
              prices.map((price: Price, idx: number) => (
                <PriceCard key={idx} price={price} />
              ))
            }
          </div>
        )
      }


    </div >
  );
}
