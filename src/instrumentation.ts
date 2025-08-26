import * as Sentry from '@sentry/nextjs'

import { registerOTel } from '@vercel/otel'
import { LangfuseExporter } from 'langfuse-vercel'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT

export async function register() {
  registerOTel({
    serviceName: 'tutor-gpt',
    traceExporter: new LangfuseExporter(),
  })

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: SENTRY_DSN,

      ignoreErrors: [
        /Hydration failed/,
        /server rendered HTML didn't match the client/,
      ],

      // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
      tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.3 : 1,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: SENTRY_DSN,

      ignoreErrors: [
        /Hydration failed/,
        /server rendered HTML didn't match the client/,
      ],
      // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
      tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.3 : 1,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,
    })
  }
}

export const onRequestError = Sentry.captureRequestError
