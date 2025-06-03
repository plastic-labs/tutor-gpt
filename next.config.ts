import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';

// Generate CSP directives based on environment
const getCSPDirectives = () => {
  const directives = [
    // Base policies
    "default-src 'self'",
    // Script handling
    isDevelopment
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://127.0.0.1:54321 https://va.vercel-scripts.com https://*.posthog.com https://vercel.live https://js.stripe.com https://checkout.stripe.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.supabase.co https://va.vercel-scripts.com https://*.posthog.com https://vercel.live https://js.stripe.com https://checkout.stripe.com",
    // Style handling
    "style-src 'self' 'unsafe-inline'",
    // Images and media
    "img-src 'self' data: blob: https:",
    // Fonts
    "font-src 'self' data:",
    // Worker handling
    "worker-src 'self' blob:",
    // Frame sources
    "frame-src 'self' https://vercel.live https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://connect.stripe.com",
    // Supabase connectivity
    isDevelopment
      ? "connect-src 'self' http://127.0.0.1:54321 https://vitals.vercel-insights.com https://*.posthog.com https://vercel.live https://js.stripe.com https://checkout.stripe.com"
      : "connect-src 'self' https://*.supabase.co https://*.supabase.net https://vitals.vercel-insights.com https://*.posthog.com https://vercel.live https://js.stripe.com https://checkout.stripe.com",
    // Frame security
    "frame-ancestors 'none'",
    // Form submissions
    "form-action 'self'",
    // Base URI restriction
    "base-uri 'self'",
    // Only include upgrade-insecure-requests in production
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
    // Block mixed content
    'block-all-mixed-content',
  ];

  return directives.join('; ');
};

const nextConfig: NextConfig = {
  // Enables strict mode for enhanced security
  reactStrictMode: true,

  // Disable x-powered-by header to prevent information disclosure
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: getCSPDirectives(),
          },
          // Strict Transport Security
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS Protection as fallback
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy (formerly Feature-Policy)
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      // Additional headers for API routes
      {
        source: '/api/:path*',
        headers: [
          // Prevent caching of API responses
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0, must-revalidate',
          },
          // Ensure API responses aren't cached
          {
            key: 'Pragma',
            value: 'no-cache',
          },
        ],
      },
    ];
  },

  output: 'standalone',

  // experimental: {
  //   instrumentationHook: true,
  // }
  // webpack: (config, { isServer }) => {
  //   // Add a fallback for the https scheme
  //   config.resolve.fallback = {
  //     ...config.resolve.fallback,
  //     https: false,
  //   };
  //
  //   return config;
  // },
};

const sentryConfig = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: 'plastic-labs',
  project: 'tutor-gpt-web',
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,
  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },
  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',
  // Hides source maps from generated client bundles
  sourcemaps: {
    disable: true,
  },
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,

  headers: {
    key: 'Document-Policy',
    value: 'js-profiling',
  },
});

export default sentryConfig;
// export default MillionLint.next({ rsc: true })(sentryConfig);
