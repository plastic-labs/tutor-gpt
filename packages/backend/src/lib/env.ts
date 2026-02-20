/** Validated environment variables */
export const env = {
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',

  // AI
  AI_PROVIDER: process.env.AI_PROVIDER ?? 'openrouter',
  AI_API_KEY: process.env.AI_API_KEY ?? '',
  AI_BASE_URL:
    process.env.AI_BASE_URL ?? 'https://openrouter.ai/api/v1',
  MODEL: process.env.MODEL ?? 'gpt-3.5-turbo',

  // Honcho
  HONCHO_API_KEY: process.env.HONCHO_API_KEY ?? '',
  HONCHO_URL: process.env.HONCHO_URL ?? '',
  HONCHO_APP_NAME: process.env.HONCHO_APP_NAME ?? 'bloom',
  HONCHO_WORKSPACE_ID: process.env.HONCHO_WORKSPACE_ID ?? '',
  HONCHO_ENV: process.env.HONCHO_ENV ?? 'production',

  // Exa
  EXA_API_KEY: process.env.EXA_API_KEY ?? '',

  // Arcjet
  ARCJET_KEY: process.env.ARCJET_KEY ?? '',

  // CORS
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',

  // Sentry
  SENTRY_DSN: process.env.SENTRY_DSN ?? '',
  SENTRY_RELEASE: process.env.SENTRY_RELEASE ?? 'dev',
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT ?? 'local',

  // Server
  PORT: parseInt(process.env.PORT ?? '3001', 10),
} as const;
