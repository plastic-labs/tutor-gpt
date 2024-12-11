import type { Cache } from 'swr';

const memoryCache = new Map<string, any>();

export const cacheProvider = (cache: Readonly<Cache<any>>) => ({
  get: (key: string) => memoryCache.get(key),
  set: (key: string, value: any) => memoryCache.set(key, value),
  delete: (key: string) => memoryCache.delete(key),
  keys: () => Array.from(memoryCache.keys())[Symbol.iterator]()
});

export const clearSWRCache = () => memoryCache.clear();