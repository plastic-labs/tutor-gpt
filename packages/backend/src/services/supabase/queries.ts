import { supabaseAdmin } from './admin.js';

export async function getChatAccess(userId: string) {
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const isSubscribed =
    subscription?.status === 'active' && !subscription.cancel_at_period_end;

  const isTrialing = subscription?.status === 'trialing';
  const trialEnded = subscription?.trial_end
    ? new Date(subscription.trial_end) < new Date()
    : false;

  const freeMessages =
    isTrialing && !trialEnded
      ? ((subscription?.metadata as { freeMessages: number })?.freeMessages ?? 0)
      : 0;

  return {
    isSubscribed,
    freeMessages,
    canChat: isSubscribed || freeMessages > 0,
  };
}

export async function getSubscription(userId: string) {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .eq('user_id', userId)
    .maybeSingle();

  return data;
}

export async function getProducts() {
  const { data } = await supabaseAdmin
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  return data;
}
