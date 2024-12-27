import { cache } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from '../unstableCache';


export const getChatAccess = unstable_cache(
  async (subscription) => {
    
    // Rest of the function remains the same
    const isSubscribed = subscription?.status === 'active' && 
      !subscription.cancel_at_period_end;

    const isTrialing = subscription?.status === 'trialing';
    const trialEnded = subscription?.trial_end 
      ? new Date(subscription.trial_end) < new Date() 
      : false;
    
    const freeMessages = (isTrialing && !trialEnded)
      ? (subscription?.metadata as { freeMessages: number })?.freeMessages ?? 0
      : 0;
    return {
      isSubscribed,
      freeMessages,
      canChat: isSubscribed || freeMessages > 0
    };
  },
  ['chat-access'],
  { revalidate: 60 }
);

export const getSubscription = cache(async (supabase: SupabaseClient) => {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .in('status', ['trialing', 'active'])
    .maybeSingle();

  return subscription;
});

export const getProducts = cache(async (supabase: SupabaseClient) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  return products;
});
