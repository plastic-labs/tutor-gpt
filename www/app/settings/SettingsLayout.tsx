'use client';

import { useState } from 'react';
import SubscriptionSettings from '@/components/settings/SubscriptionSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { SupportSettings } from '@/components/settings/SupportSettings';
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
  const [activeTab, setActiveTab] = useState('account');

  const navItems = [
    { id: 'account', label: 'Account' },
    { id: 'security', label: 'Security' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'support', label: 'Support' },
  ];

  return (
    <div className={`flex-1 flex flex-col bg-background text-foreground`}>
      <div className="flex-1 flex">
        <div className="py-4">
          <nav className="w-64 bg-gray-100 dark:bg-muted p-4 rounded-lg">
            {' '}
            <ul>
              {navItems.map((item) => (
                <li key={item.id} className="mb-2">
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left p-2 rounded transition-colors ${activeTab === item.id
                      ? 'bg-gray-400 text-primary-foreground dark:bg-neon-green dark:text-black'
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
