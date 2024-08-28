// app/providers.tsx
'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const posthogKey: string = process.env.NEXT_PUBLIC_POSTHOG_KEY || ""
const posthogHost: string = process.env.NEXT_PUBLIC_POSTHOG_HOST || ""

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_URL != "http://localhost:3000") {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false // Disable automatic pageview capture, as we capture manually
  })
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
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return <></>;
}

export function PHProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
