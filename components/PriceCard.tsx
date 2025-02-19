'use client';

import { Tables } from '@/utils/database.types';

import { loadStripe } from '@stripe/stripe-js';

import { checkoutWithStripe } from '@/utils/stripe/actions';
import { useRouter, usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Price = Tables<'prices'>;

interface PriceCardProps {
  price: Price;
}

export default function PriceCard({ price }: PriceCardProps) {
  const currentPath = usePathname();
  const router = useRouter();

  const subscribe = async () => {
    const { errorRedirect, sessionId } = await checkoutWithStripe(
      price,
      currentPath
    );

    if (errorRedirect) {
      return router.push(errorRedirect);
    }

    if (!sessionId) {
      console.error('Error');
      return;
    }

    const stripe = await loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    );
    stripe?.redirectToCheckout({ sessionId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-lg">
          {price.interval == 'month' ? 'Monthly' : 'Yearly'}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center text-lg">
        <h2>${price.unit_amount ? price.unit_amount / 100 : 0}</h2>
      </CardContent>
      <CardFooter>
        <Button
          className="bg-primary dark:bg-neon-green text-primary-foreground dark:text-dark-green hover:bg-primary/90 dark:hover:bg-neon-green/90 mt-2"
          onClick={subscribe}
        >
          Subscribe
        </Button>
      </CardFooter>
    </Card>
  );
}
