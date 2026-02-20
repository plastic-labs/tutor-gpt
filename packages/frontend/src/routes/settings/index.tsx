import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useBYOKStore } from '@/stores/byokStore';
import { api } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import type { BYOKProvider } from '@bloom/shared/types';

export const Route = createFileRoute('/settings/')({
  beforeLoad: () => {
    const { user, loading } = useAuthStore.getState();
    if (!loading && !user) {
      throw redirect({ to: '/auth' });
    }
  },
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data, error } = await api.settings.subscription.get();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center gap-4 p-4 border-b">
        <button onClick={() => navigate({ to: '/' })}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-8">
        {/* Account */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Account</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Email: {user?.email}
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: '/auth' });
            }}
            className="px-4 py-2 text-sm border border-destructive text-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground"
          >
            Sign Out
          </button>
        </section>

        {/* Subscription */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Subscription</h2>
          {subscription ? (
            <div className="space-y-2">
              <p className="text-sm">
                Status:{' '}
                <span className="font-medium capitalize">
                  {subscription.subscription?.status ?? 'None'}
                </span>
              </p>
              {!subscription.isSubscribed && (
                <p className="text-sm text-muted-foreground">
                  Free messages remaining: {subscription.freeMessages ?? 0}
                </p>
              )}
              <div className="flex gap-2">
                {!subscription.isSubscribed && (
                  <button
                    onClick={async () => {
                      const { data } = await api.settings.checkout.post({
                        priceId: 'price_xxx', // TODO: Get from products list
                        mode: 'subscription',
                      });
                      if (data?.sessionId) {
                        const stripe = await import('@stripe/stripe-js').then(
                          (m) =>
                            m.loadStripe(
                              import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''
                            )
                        );
                        await stripe?.redirectToCheckout({
                          sessionId: data.sessionId,
                        });
                      }
                    }}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md"
                  >
                    Subscribe
                  </button>
                )}
                {subscription.isSubscribed && (
                  <button
                    onClick={async () => {
                      const { data } = await api.settings.portal.post();
                      if (data?.url) {
                        window.location.href = data.url;
                      }
                    }}
                    className="px-4 py-2 text-sm border border-input rounded-md"
                  >
                    Manage Subscription
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
        </section>

        {/* BYOK */}
        <BYOKSection />
      </div>
    </div>
  );
}

function BYOKSection() {
  const {
    enabled,
    provider,
    model,
    baseUrl,
    setEnabled,
    setProvider,
    setApiKey,
    setModel,
    setBaseUrl,
  } = useBYOKStore();

  const [apiKeyInput, setApiKeyInput] = useState('');

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Bring Your Own Key</h2>
      <p className="text-sm text-muted-foreground">
        Use your own API key to chat without a subscription.
      </p>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm">Enable BYOK</span>
      </label>

      {enabled && (
        <div className="space-y-3 pl-6">
          <div className="space-y-1">
            <label className="text-sm font-medium">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as BYOKProvider)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="openrouter">OpenRouter</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">API Key</label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onBlur={() => {
                if (apiKeyInput) {
                  setApiKey(apiKeyInput);
                  setApiKeyInput('');
                }
              }}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Model</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o"
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
            />
          </div>

          {(provider === 'custom' || provider === 'openrouter') && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Base URL</label>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
