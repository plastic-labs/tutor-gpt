import { Elysia, t } from 'elysia';
import Stripe from 'stripe';
import { authMiddleware } from '../middleware/auth.js';
import {
  getChatAccess,
  getSubscription,
  getProducts,
} from '../services/supabase/queries.js';
import { createOrRetrieveCustomer } from '../services/supabase/admin.js';
import { env } from '../lib/env.js';
import { calculateTrialEndUnixTimestamp } from '../lib/helpers.js';

export const settingsRoutes = new Elysia({ prefix: '/settings' })
  .use(authMiddleware)
  .get('/subscription', async ({ userId }) => {
    const [access, subscription] = await Promise.all([
      getChatAccess(userId),
      getSubscription(userId),
    ]);

    return {
      ...access,
      subscription,
    };
  })
  .get('/products', async () => {
    return await getProducts();
  })
  .post(
    '/checkout',
    async ({ body, userId, email }) => {
      if (!env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe not configured');
      }

      const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-01-27.acacia',
      });

      const customer = await createOrRetrieveCustomer({
        uuid: userId,
        email: email ?? '',
      });

      const params: Stripe.Checkout.SessionCreateParams = {
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        customer,
        customer_update: { address: 'auto' },
        line_items: [{ price: body.priceId, quantity: 1 }],
        cancel_url: `${env.FRONTEND_URL}${body.redirectPath ?? '/settings'}`,
        success_url: `${env.FRONTEND_URL}${body.redirectPath ?? '/settings'}`,
        metadata: { product: 'bloom' },
      };

      if (body.mode === 'subscription') {
        Object.assign(params, {
          mode: 'subscription',
          subscription_data: {
            trial_end: calculateTrialEndUnixTimestamp(body.trialPeriodDays),
          },
        });
      } else {
        Object.assign(params, { mode: 'payment' });
      }

      const session = await stripe.checkout.sessions.create(params);
      return { sessionId: session.id };
    },
    {
      body: t.Object({
        priceId: t.String(),
        mode: t.Union([t.Literal('subscription'), t.Literal('payment')]),
        redirectPath: t.Optional(t.String()),
        trialPeriodDays: t.Optional(t.Number()),
      }),
    }
  )
  .post('/portal', async ({ userId, email }) => {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe not configured');
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
    });

    const customer = await createOrRetrieveCustomer({
      uuid: userId,
      email: email ?? '',
    });

    const { url } = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${env.FRONTEND_URL}/settings`,
    });

    return { url };
  });
