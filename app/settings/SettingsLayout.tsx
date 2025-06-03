'use client';

import { useEffect, useMemo, useState } from 'react';
import SubscriptionSettings from '@/components/settings/SubscriptionSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { SupportSettings } from '@/components/settings/SupportSettings';
import { Header } from '@/components/header';
import { Subscription, User } from '@supabase/supabase-js';

interface SettingsProps {
  user: User | null;
  subscription?: Subscription | null; // Change this to the correct type when available
  products?: unknown[] | null; // Change this to the correct type when available
}

export default function SettingsLayout({
  user,
  subscription,
  products,
}: SettingsProps) {
  const navItems = useMemo(
    () => [
      { id: 'account', label: 'Account' },
      { id: 'security', label: 'Security' },
      { id: 'subscription', label: 'Subscription' },
      { id: 'support', label: 'Support' },
    ],
    []
  );

  const [activeTab, setActiveTab] = useState('account'); // Default to 'account' initially

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (navItems.some((item) => item.id === hash)) {
        setActiveTab(hash);
      }
    };

    // Check initial hash
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [navItems]);

  return (
    <div className={`flex-1 flex flex-col bg-background text-foreground`}>
      <Header />
      <div className="flex-1 flex">
        <div className="py-4">
          <nav className="w-64 bg-background dark:bg-muted p-4 rounded-lg">
            {' '}
            <ul>
              {navItems.map((item) => (
                <li key={item.id} className="mb-2">
                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      window.location.hash = item.id;
                    }}
                    className={`w-full text-left p-2 rounded transition-colors ${
                      activeTab === item.id
                        ? 'bg-accent text-foreground'
                        : 'hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-neon-green/20 dark:hover:text-neon-green'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex-1 p-8">
          {activeTab === 'account' && <AccountSettings user={user} />}
          {activeTab === 'security' && <SecuritySettings user={user} />}
          {activeTab === 'subscription' && (
            <SubscriptionSettings
              subscription={subscription ?? null}
              products={products ?? null}
            />
          )}
          {activeTab === 'support' && <SupportSettings />}
        </div>
      </div>
    </div>
  );
}
