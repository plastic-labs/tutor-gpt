'use client';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { SWRConfig } from 'swr';
import { localStorageProvider } from '@/utils/swrCache';

const posthogKey: string = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
const posthogHost: string = process.env.NEXT_PUBLIC_POSTHOG_HOST || '';

if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_SITE_URL != 'http://localhost:3000'
) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
  });
}

export function PostHogPageview(): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return <></>;
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: localStorageProvider
      }}
    >
      {children}
    </SWRConfig>
  );
}
