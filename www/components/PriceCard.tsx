'use client'

import { Tables } from '@/utils/database.types'

import { loadStripe } from '@stripe/stripe-js';

import { checkoutWithStripe } from '@/utils/stripe/actions';
import { useRouter, usePathname } from "next/navigation";
// import { getErrorRedirect } from '@/utils/helpers';

type Price = Tables<'prices'>;

interface PriceCardProps {
  price: Price
}

export default function PriceCard({ price }: PriceCardProps) {
  const currentPath = usePathname();
  const router = useRouter();

  const subscribe = async () => {
    console.log("Subscribing")
    const { errorRedirect, sessionId } = await checkoutWithStripe(price, currentPath);

    console.log(sessionId)

    if (errorRedirect) {
      return router.push(errorRedirect)
    }

    if (!sessionId) {
      console.error("Error")
      return
      // return router.push(
      //   getErrorRedirect(
      //     currentPath,
      //     'An unknown error occurred',
      //     'Please try again later or contact a system administrator',
      //   )
      // )
    }

    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
    stripe?.redirectToCheckout({ sessionId })
  }

  return (
    <div>
      <h2>{price.unit_amount ? price.unit_amount / 100 : 0}</h2>
      <p>{price.interval}</p>
      <button onClick={subscribe}>Subscribe</button>
    </div>
  )
}
