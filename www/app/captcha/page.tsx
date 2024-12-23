'use client';
import Turnstile, { useTurnstile } from 'react-turnstile';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function Captcha() {
  const turnstile = useTurnstile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!turnstileSiteKey) {
      router.push(redirectUrl);
    }
  }, [turnstileSiteKey, router, redirectUrl]);

  if (!turnstileSiteKey) {
    return null;
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          Verifying you&apos;re human
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-8">
          Please complete the security check to continue
        </p>
        <div className="flex justify-center">
          <Turnstile
            sitekey={turnstileSiteKey}
            appearance="interaction-only"
            onVerify={async (token) => {
              document.cookie = `cf-turnstile-response=${token}; path=/`;
              turnstile.remove();
              router.push(redirectUrl);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function CaptchaPage() {
  return (
    <Suspense>
      <Captcha />
    </Suspense>
  );
}
