import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BYOKProvider } from '@bloom/shared/types';

interface BYOKState {
  enabled: boolean;
  provider: BYOKProvider;
  encryptedApiKey: string;
  model: string;
  baseUrl: string;

  setEnabled: (enabled: boolean) => void;
  setProvider: (provider: BYOKProvider) => void;
  setApiKey: (key: string) => Promise<void>;
  getApiKey: () => Promise<string>;
  setModel: (model: string) => void;
  setBaseUrl: (url: string) => void;
}

// Simple encryption using Web Crypto API
async function encrypt(text: string): Promise<string> {
  if (!text) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  // Store key + iv + ciphertext as base64
  const combined = new Uint8Array([
    ...new Uint8Array(exportedKey),
    ...iv,
    ...new Uint8Array(encrypted),
  ]);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encoded: string): Promise<string> {
  if (!encoded) return '';
  try {
    const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const rawKey = combined.slice(0, 32);
    const iv = combined.slice(32, 44);
    const ciphertext = combined.slice(44);

    const key = await crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return '';
  }
}

export const useBYOKStore = create<BYOKState>()(
  persist(
    (set, get) => ({
      enabled: false,
      provider: 'openai' as BYOKProvider,
      encryptedApiKey: '',
      model: 'gpt-4o',
      baseUrl: '',

      setEnabled: (enabled) => set({ enabled }),
      setProvider: (provider) => set({ provider }),
      setApiKey: async (key) => {
        const encrypted = await encrypt(key);
        set({ encryptedApiKey: encrypted });
      },
      getApiKey: async () => {
        return decrypt(get().encryptedApiKey);
      },
      setModel: (model) => set({ model }),
      setBaseUrl: (url) => set({ baseUrl: url }),
    }),
    {
      name: 'bloom-byok',
      partialize: (state) => ({
        enabled: state.enabled,
        provider: state.provider,
        encryptedApiKey: state.encryptedApiKey,
        model: state.model,
        baseUrl: state.baseUrl,
      }),
    }
  )
);
