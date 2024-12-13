import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase environment variables are not set');
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncProducts() {
  console.log('Starting product sync...');

  // Fetch all active products from Stripe
  const stripeProducts = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  // Fetch existing products from Supabase
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id');

  const existingProductIds = new Set(existingProducts?.map(p => p.id) || []);

  for (const product of stripeProducts.data) {
    const productData = {
      id: product.id,
      active: product.active,
      name: product.name,
      description: product.description,
      image: product.images?.[0] || null,
      metadata: product.metadata
    };
    console.log(product)
    //
    if (existingProductIds.has(product.id)) {
      // Update existing product
      const { error: updateError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', product.id);
      if (updateError) {
        console.error(`Error updating product ${product.id}:`, updateError);
      } else {
        console.log(`Updated product ${product.id}`);
      }
    } else {
      // Insert new product
      const { error: insertError } = await supabase
        .from('products')
        .insert(productData);

      if (insertError) {
        console.error(`Error inserting product ${product.id}:`, insertError);
      } else {
        console.log(`Inserted new product ${product.id}`);
      }
    }
  }
}

async function syncPrices() {
  console.log('Starting price sync...');

  // Fetch all active prices from Stripe
  const stripePrices = await stripe.prices.list({
    active: true,
    expand: ['data.product']
  });

  // Fetch existing prices from Supabase
  const { data: existingPrices } = await supabase
    .from('prices')
    .select('id');

  const existingPriceIds = new Set(existingPrices?.map(p => p.id) || []);

  for (const price of stripePrices.data) {

    // Ensure we have a valid product ID string
    const productId = typeof price.product === 'string' ? price.product : price.product.id;

    const priceData = {
      id: price.id,
      product_id: productId,
      active: price.active,
      description: price.nickname || null,
      unit_amount: price.unit_amount,
      currency: price.currency,
      type: price.type === 'recurring' ? 'recurring' : 'one_time',
      interval: price.recurring?.interval || null,
      interval_count: price.recurring?.interval_count || null,
      trial_period_days: price.recurring?.trial_period_days || null,
      metadata: price.metadata
    };

    if (existingPriceIds.has(price.id)) {
      // Update existing price
      const { error: updateError } = await supabase
        .from('prices')
        .update(priceData)
        .eq('id', price.id);

      if (updateError) {
        console.error(`Error updating price ${price.id}:`, updateError);
      } else {
        console.log(`Updated price ${price.id}`);
      }
    } else {
      // Insert new price
      const { error: insertError } = await supabase
        .from('prices')
        .insert(priceData);

      if (insertError) {
        console.error(`Error inserting price ${price.id}:`, insertError);
      } else {
        console.log(`Inserted new price ${price.id}`);
      }
    }
  }
}

async function main() {
  try {
    await syncProducts();
    await syncPrices();
    console.log('Sync completed successfully!');
  } catch (error) {
    console.error('Sync failed:', error);
  }
  process.exit(0);
}

main();
