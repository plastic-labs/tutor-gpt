import { createClient } from '@/utils/supabase/server';
import SubscriptionManager from '@/components/SubscriptionManager';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getSubscription, getProducts } from '@/utils/supabase/queries';

export default async function SubscriptionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const subscription = await getSubscription(supabase);
  const products = await getProducts(supabase);

  if (!user) {
    redirect('/auth');
    // return <div>Please log in to manage your subscription.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Manage Your Subscription</h1>
      <SubscriptionManager subscription={subscription} products={products} />
      <Link href="/">
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50" > Return Home</button>
      </Link>
    </div>
  );
}
