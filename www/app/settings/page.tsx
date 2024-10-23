'use client';

import { useState, useEffect } from 'react';
import SettingsLayout from './SettingsLayout';
import { createClient } from '@/utils/supabase/client';
import { getSubscription } from '@/utils/supabase/queries';
import { User } from '@supabase/supabase-js';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      const sub = await getSubscription(supabase);
      setSubscription(sub);

      // Fetch products if needed
      // const productsData = await fetchProducts();
      // setProducts(productsData);
    };

    fetchData();
  }, []);

  return (
    <div className={`min-h-screen`}>
      <SettingsLayout
        user={user}
        subscription={subscription}
        products={products}
      />
    </div>
  );
}
