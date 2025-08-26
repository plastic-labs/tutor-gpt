'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import PriceCard from '@/components/PriceCard'
import { Button } from '@/components/ui/button'
import type { Tables } from '@/utils/database.types'
import { createStripePortal } from '@/utils/stripe/actions'

type Price = Tables<'prices'>
// type Subscription = Tables<'subscriptions'>;

interface Props {
  subscription: any | null

  products: any[] | null
}

export default function SubscriptionManager({ subscription, products }: Props) {
  const [loading, setLoading] = useState(false)

  const prices = products?.[0]?.prices ?? []

  const router = useRouter()

  const handleManage = async () => {
    setLoading(true)
    try {
      const url = await createStripePortal()

      if (url) {
        router.push(url)
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-3xl text-primary">
        Subscription Management
      </h2>
      <div className="mt-4">
        <h2 className="mb-2 font-bold text-xl">Subscription Status</h2>
        <p className="mb-4">
          {subscription != null && subscription.status === 'active'
            ? 'Active Subscription'
            : 'No Active Subscription'}
        </p>
        {subscription != null && subscription.status === 'active' ? (
          <Button
            onClick={handleManage}
            disabled={loading}
            className="rounded bg-neon-green px-4 py-2 text-foreground hover:bg-primary/90 dark:text-dark-green dark:hover:bg-neon-green/90"
          >
            Manage Subscription
          </Button>
        ) : (
          <div className="flex flex-row gap-3">
            {prices.map((price: Price, idx: number) => (
              <PriceCard key={idx} price={price} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
