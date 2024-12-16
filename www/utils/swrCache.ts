import { Cache, State } from 'swr';

export let unloadListener: ((ev: BeforeUnloadEvent) => void) | null = null;

export function localStorageProvider(): Cache {
  if (typeof window !== 'undefined') {
    const map: Map<string, State> = new Map(
      JSON.parse(localStorage.getItem('app-cache') || '[]')
    );

    // Remove any existing listener
    if (unloadListener) {
      window.removeEventListener('beforeunload', unloadListener);
    }

    unloadListener = () => {
      localStorage.setItem('app-cache', JSON.stringify(Array.from(map.entries())));
    };
    window.addEventListener('beforeunload', unloadListener);

    return map;
  }
  return new Map();
}

export const clearSWRCache = () => {
  if (typeof window !== 'undefined') {
    // Remove the listener before clearing cache
    if (unloadListener) {
      window.removeEventListener('beforeunload', unloadListener);
      unloadListener = null;
    }
    localStorage.removeItem('app-cache');
  }
};