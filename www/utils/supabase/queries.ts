import { cache } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache as next_unstable_cache } from 'next/cache';
import { getFreeMessageCount } from './actions';

export const unstable_cache = <Inputs extends unknown[], Output>(
  callback: (...args: Inputs) => Promise<Output>,
  key: string[],
  options: { revalidate: number },
) => cache(next_unstable_cache(callback, key, options));

export const getChatAccess = unstable_cache(
  async (supabase: SupabaseClient, userId: string) => {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, trial_end')
      .in('status', ['trialing', 'active'])
      .maybeSingle();
    
    const isSubscribed = !!(subscription && subscription.status === 'active' && !subscription.trial_end);
    const freeMessages = isSubscribed ? 0 : await getFreeMessageCount(userId);
    
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
