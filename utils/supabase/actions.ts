'use server'; // This directive marks all exports as server actions

import { createFreeTrialSubscription, decrementFreeMessages } from './admin';
import { createClient } from './server';
import { getChatAccess, getSubscription } from './queries';

export async function getChatAccessWithUser(userId: string) {
  const subscription = await createOrRetrieveFreeTrialSubscription(userId);
  return getChatAccess(subscription);
}

export async function createOrRetrieveFreeTrialSubscription(userId: string) {
  // In dev mode, return a dummy subscription
  if (process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'false') {
    return {
      id: 'dev_subscription',
      user_id: userId,
      status: 'trialing',
      metadata: { freeMessages: 999999 },
      price_id: null,
      quantity: 1,
      cancel_at_period_end: false,
      created: new Date().toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      trial_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  const supabase = await createClient();
  const existingSub = await getSubscription(supabase);
  if (existingSub) return existingSub;

  // If no subscription exists, create one with admin privileges
  return createFreeTrialSubscription(userId);
}

export async function getFreeMessageCount(userId: string) {
  const subscription = await createOrRetrieveFreeTrialSubscription(userId);
  return (
    (subscription?.metadata as { freeMessages: number })?.freeMessages ?? 0
  );
}

export async function useFreeTrial(userId: string) {
  return decrementFreeMessages(userId);
}
