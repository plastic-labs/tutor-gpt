// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

let sentryRate = 0.1;

if (process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT !== "production") {
  sentryRate = 1;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: sentryRate,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
