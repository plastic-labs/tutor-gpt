'use server'  // This directive marks all exports as server actions

import { createOrRetrieveFreeTrialSubscription, decrementFreeMessages } from '@/utils/supabase/admin';

export async function getFreeMessageCount(userId: string) {
    const subscription = await createOrRetrieveFreeTrialSubscription(userId);
    return (subscription.metadata as { freeMessages: number })?.freeMessages ?? 0;
}

export async function useFreeTrial(userId: string) {
    return decrementFreeMessages(userId);
}