export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'unpaid'
  | 'paused';

export interface Subscription {
  id: string;
  userId: string;
  status: SubscriptionStatus | null;
  priceId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean | null;
  trialStart: string | null;
  trialEnd: string | null;
}

export interface Product {
  id: string;
  name: string | null;
  description: string | null;
  image: string | null;
  active: boolean | null;
  metadata: Record<string, unknown> | null;
}

export interface Price {
  id: string;
  productId: string | null;
  active: boolean | null;
  unitAmount: number | null;
  currency: string | null;
  interval: 'day' | 'week' | 'month' | 'year' | null;
  intervalCount: number | null;
  trialPeriodDays: number | null;
  type: 'one_time' | 'recurring' | null;
}
