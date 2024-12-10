import { Cache, State } from 'swr';

export function localStorageProvider(): Cache {
  // When initializing, we restore the data from `localStorage` into a map.
  if (typeof window !== 'undefined') {
    const map: Map<string, State> = new Map(
      JSON.parse(localStorage.getItem('app-cache') || '[]')
    );

    // Before unloading the app, we write back all the data into `localStorage`.
    window.addEventListener('beforeunload', () => {
      const appCache = JSON.stringify(Array.from(map.entries()));
      localStorage.setItem('app-cache', appCache);
    });
    return map;
  }

  return new Map();
}
