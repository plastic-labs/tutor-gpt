'use server'; // This directive marks all exports as server actions

import { createFreeTrialSubscription, decrementFreeMessages } from './admin';
import { createClient } from './server';
import { getChatAccess, getSubscription } from './queries';

export async function getChatAccessWithUser(userId: string) {
  const subscription = await createOrRetrieveFreeTrialSubscription(userId);
  return getChatAccess(subscription);
}

export async function createOrRetrieveFreeTrialSubscription(userId: string) {
  const supabase = createClient();
  const existingSub = await getSubscription(supabase);
  if (existingSub) return existingSub;

  // If no subscription exists, create one with admin privileges
  return createFreeTrialSubscription(userId);
}

export async function getFreeMessageCount(userId: string) {
  const subscription = await createOrRetrieveFreeTrialSubscription(userId);
  return (subscription?.metadata as { freeMessages: number })?.freeMessages ?? 0;
}

export async function useFreeTrial(userId: string) {
  return decrementFreeMessages(userId);
}