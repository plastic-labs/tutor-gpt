import { Elysia } from 'elysia';
import Stripe from 'stripe';
import { env } from '../lib/env.js';
import {
  upsertProductRecord,
  upsertPriceRecord,
  deleteProductRecord,
  deletePriceRecord,
  manageSubscriptionStatusChange,
} from '../services/supabase/admin.js';

const relevantEvents = new Set([
  'product.created',
  'product.updated',
  'product.deleted',
  'price.created',
  'price.updated',
  'price.deleted',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

export const webhookRoutes = new Elysia({ prefix: '/webhook' }).post(
  '/',
  async ({ request }) => {
    if (!env.STRIPE_SECRET_KEY) {
      return new Response('Stripe not configured', { status: 200 });
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
    });

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
      return new Response('Webhook secret not found.', { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('Webhook Error:', err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    if (!relevantEvents.has(event.type)) {
      return new Response(`Unhandled event type ${event.type}`, { status: 400 });
    }

    try {
      switch (event.type) {
        case 'product.created':
        case 'product.updated':
          await upsertProductRecord(event.data.object as Stripe.Product);
          break;
        case 'price.created':
        case 'price.updated':
          await upsertPriceRecord(event.data.object as Stripe.Price);
          break;
        case 'price.deleted':
          await deletePriceRecord(event.data.object as Stripe.Price);
          break;
        case 'product.deleted':
          await deleteProductRecord(event.data.object as Stripe.Product);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            event.type === 'customer.subscription.created'
          );
          break;
        }
        case 'checkout.session.completed': {
          const checkoutSession = event.data
            .object as Stripe.Checkout.Session;
          const { metadata } = checkoutSession;
          if (
            metadata?.product === 'bloom' &&
            checkoutSession.mode === 'subscription'
          ) {
            await manageSubscriptionStatusChange(
              checkoutSession.subscription as string,
              checkoutSession.customer as string,
              true
            );
          }
          break;
        }
      }
    } catch (error) {
      console.error('Webhook handler error:', error);
      return new Response('Webhook handler failed.', { status: 400 });
    }

    return Response.json({ received: true });
  }
);
