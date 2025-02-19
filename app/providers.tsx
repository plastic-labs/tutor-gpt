'use client';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, type JSX } from 'react';
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
        provider: localStorageProvider,
      }}
    >
      {children}
    </SWRConfig>
  );
}

export function ViewportScaleProvider() {
  useEffect(() => {
    // Only run on iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      let viewport = document.querySelector(
        'meta[name="viewport"]'
      ) as HTMLMetaElement;

      // Create one if it doesn't exist
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.head.appendChild(viewport);
      }

      // Set the viewport content
      viewport.content =
        'width=device-width, initial-scale=1.0, maximum-scale=1.0';

      // Cleanup function
      return () => {
        if (viewport) {
          viewport.content = 'width=device-width, initial-scale=1.0';
        }
      };
    }
  }, []);
  return <></>;
}
