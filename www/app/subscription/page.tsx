import { createClient } from '@/utils/supabase/server';
import SubscriptionManager from '@/components/SubscriptionManager';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { checkSubscription } from "@/utils/stripe/actions";

export default async function SubscriptionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // const checkSubscription = async () => {
  //   const { data: { user } } = await supabase.auth.getUser();
  //   if (user) {
  //     const { data: subscription } = await supabase
  //       .from('subscriptions')
  //       .select('status')
  //       .eq('user_id', user.id)
  //       .single();
  //     return subscription?.status
  //   }
  // };

  const subStatus = await checkSubscription();

  if (!user) {
    redirect('/auth');
    // return <div>Please log in to manage your subscription.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Manage Your Subscription</h1>
      <SubscriptionManager subStatus={subStatus} />
      <Link href="/"><button> Return Home</button></Link>
    </div>
  );
}
