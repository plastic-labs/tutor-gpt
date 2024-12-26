import { cache } from 'react';
import { unstable_cache as next_unstable_cache } from 'next/cache';

export const unstable_cache = <Args extends any[], Output>(
    callback: (...args: Args) => Promise<Output>,
    key: string[],
    options: { revalidate: number },
  ) => {
    return cache(
      next_unstable_cache(
        callback as unknown as (...args: any[]) => Promise<Output>,
        key,
        options
      )
    );
  };