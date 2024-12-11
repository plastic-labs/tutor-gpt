import { createStore, get, set, del, clear, } from 'idb-keyval';
import type { Cache } from 'swr';

const store = typeof window !== 'undefined' 
  ? createStore('bloom-db', 'messages')
  : null;

// In-memory cache for synchronous operations
const memoryCache = new Map<string, any>();

export const clearSWRCache = async () => {
  memoryCache.clear();
  if (store && typeof window !== 'undefined') {
    try {
      await clear(store);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
};

export const cacheProvider = (cache: Readonly<Cache<any>>) => {
  return {
    get: (key: string) => {
      return memoryCache.get(key);
    },
    set: (key: string, value: any) => {
      memoryCache.set(key, value);
      // Persist to IndexedDB in background
      if (store) {
        set(key, value, store).catch(console.error);
      }
    },
    delete: (key: string) => {
      memoryCache.delete(key);
      // Delete from IndexedDB in background
      if (store) {
        del(key, store).catch(console.error);
      }
    },
    keys: () => {
      return memoryCache.keys();
    }
  }
}