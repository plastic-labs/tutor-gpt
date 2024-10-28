'use client';

import { useState } from 'react';
import SubscriptionSettings from '@/components/settings/SubscriptionSettings';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { SupportSettings } from '@/components/settings/SupportSettings';
import { User } from '@supabase/supabase-js';

interface SettingsProps {
  user: User | null;
  subscription?: any | null; // Change this to the correct type when available
  products?: any[] | null; // Change this to the correct type when available
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
    { id: 'integrations', label: 'Integrations' },
    { id: 'support', label: 'Support' },
  ];

  return (
    <div className={`flex flex-1 flex-col bg-background text-foreground`}>
      <div className="flex flex-1">
        <div className="py-4">
          <nav className="w-64 bg-muted p-4">
            <ul>
              {navItems.map((item) => (
                <li key={item.id} className="mb-2">
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full rounded p-2 text-left ${
                      activeTab === item.id
                        ? 'bg-primary text-primary-foreground dark:bg-neon-green dark:text-black'
                        : 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-neon-green/20'
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
          {activeTab === 'integrations' && <IntegrationsSettings />}
          {activeTab === 'support' && <SupportSettings />}
        </div>
      </div>
    </div>
  );
}
