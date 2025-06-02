import Stripe from 'stripe';
import { headers } from 'next/headers';
import {
  upsertProductRecord,
  upsertPriceRecord,
  manageSubscriptionStatusChange,
  deleteProductRecord,
  deletePriceRecord,
} from '@/utils/supabase/admin';

// Stripe Webhook events we want to track and take action against
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

/**
 * Handles incoming Stripe webhook events and processes relevant product, price, and subscription updates.
 *
 * Verifies the Stripe webhook signature, checks for required environment variables, and processes only events of interest. Updates or deletes product and price records, and manages subscription status changes in response to Stripe events. Returns appropriate HTTP responses based on processing outcome.
 *
 * @param req - The incoming HTTP request containing the Stripe webhook event.
 * @returns A Response indicating the result of webhook processing.
 *
 * @remark If the `STRIPE_SECRET_KEY` environment variable is not set, the function skips processing and returns a 200 response with a message indicating Stripe is not configured.
 */
export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log(
      'STRIPE_SECRET_KEY environment variable is not set, skipping webhook processing'
    );
    return new Response('Stripe not configured', { status: 200 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-01-27.acacia',
  });

  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      return new Response('Webhook secret not found.', { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.log('Webhook Error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    // return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'product.created':
        case 'product.updated':
          console.log('Product');
          await upsertProductRecord(event.data.object as Stripe.Product);
          break;
        case 'price.created':
        case 'price.updated':
          console.log('Price');
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
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            event.type === 'customer.subscription.created'
          );
          break;
        case 'checkout.session.completed':
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          if (checkoutSession.mode === 'subscription') {
            const subscriptionId = checkoutSession.subscription;
            manageSubscriptionStatusChange(
              subscriptionId as string,
              checkoutSession.customer as string,
              true
            );
          }
          break;
        default:
          console.error(`Unhandled relevant event type ${event.type}`);
      }
    } catch (error) {
      console.log(error);
      return new Response(
        'Webhook handler failed, view your Next.js function logs.',
        {
          status: 400,
        }
      );
    }
  } else {
    return new Response(`Unhandled event type ${event.type}`, {
      status: 400,
    });
  }
  return new Response(JSON.stringify({ received: true }));
}
