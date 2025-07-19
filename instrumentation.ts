import * as Sentry from '@sentry/nextjs'

import { registerOTel } from '@vercel/otel'
import { LangfuseExporter } from 'langfuse-vercel'

export async function register() {
  registerOTel({
    serviceName: 'tutor-gpt',
    traceExporter: new LangfuseExporter(),
  })

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-server')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./instrumentation-edge')
  }
}

export const onRequestError = Sentry.captureRequestError
