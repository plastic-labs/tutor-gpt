import { Cache, State } from 'swr';
import { createStore, get, set, clear } from 'idb-keyval';

const swrStore = createStore('bloom-db', 'swr-cache');

export async function clearSWRCache() {
  await clear(swrStore);
}

export function indexedDBProvider(): Cache {
  const cache = new Map<string, State>();

  // When initializing, restore data from IndexedDB into the map
  if (typeof window !== 'undefined') {
    get('swr-cache', swrStore).then((data: Array<[string, State]> | undefined) => {
      if (data) {
        data.forEach(([key, value]) => cache.set(key, value));
      }
    });

    // Before unloading, save map data to IndexedDB
    window.addEventListener('beforeunload', () => {
      const entries = Array.from(cache.entries());
      set('swr-cache', entries, swrStore);
    });
  }

  return cache;
}