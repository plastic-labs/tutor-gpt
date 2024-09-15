import { createClient } from '@/utils/supabase/server';
import SubscriptionManager from '@/components/SubscriptionManager';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';

export default async function SubscriptionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Please log in to manage your subscription.</div>;
  }

//   const { data: userData } = await supabase
//     .from('users')
//     .select('*')
//     .eq('id', user.id)
//     .single();


    async function createCheckoutSession(formData: FormData) {
        'use server';
    
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2023-10-16',
        });
    
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price: process.env.STRIPE_PRICE_ID,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription?success=true`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription?canceled=true`,
          client_reference_id: user.id,
        });
    
        if (session.url) {
          redirect(session.url);
        }
      }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Manage Your Subscription</h1>
      <SubscriptionManager user={userData} />
    </div>
  );
}