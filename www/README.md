# Tutor-GPT Web UI

This directory contains the code for the Full Stack Web-UI of Tutor-GPT. It is developed
using [Next.js](https://nextjs.org/) and [pnpm](https://pnpm.io).

The project uses [Supabase](https://supabase.com/) for authentication and managing users subscriptions
with [stripe](https://stripe.com/)

## Installation

Clone the repo and install the necessary NodeJS depenencies

```bash
git clone https://github.com/plastic-labs/tutor-gpt.git && cd tutor-gpt/www
pnpm install
```

Set up your [environment variables](#environment-variables) in a `.env.local`
file. Then launch the development server.

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

This section goes over the various environment variables necessary to run the
Tutor-GPT webui. A `.env.template` file is provided to get started quickly.

**Core**

- `NEXT_PUBLIC_SITE_URL` — The URL that the Next.js application will run from. For
  local development it will be `http://localhost:3000` by default.

**Agent**

- `MODEL` — The Openrouter model to use for generating responses.
- `OPENAI_API_KEY` — The Openrouter API key to use
- `HONCHO_URL` — The URL for the Honcho instance to use
- `HONCHO_APP_NAME` — The name of the app in Honcho to use

**Supabase**

- `NEXT_PUBLIC_SUPABASE_URL` — The URL for your Supabase project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — The public API key for your Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY` — The service key for the Supabase project.

**Stripe**

- `NEXT_PUBLIC_STRIPE_ENABLED` — A feature flag to enable or disable stripe. By
  default, it is `false`
- `STRIPE_SECRET_KEY` — The stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — The stripe public key
- `STRIPE_WEBHOOK_SECRET` — The stripe webhook secret


Below are several optional environment variables to enable error monitoring and
analytics.

**Sentry**

- `NEXT_PUBLIC_SENTRY_DSN` — The Sentry DSN
- `SENTRY_ENVIRONMENT` — The Sentry environment
- `SENTRY_RELEASE` — The Sentry release

**Posthog**

- `NEXT_PUBLIC_POSTHOG_KEY` — The Posthog project key
- `NEXT_PUBLIC_POSTHOG_HOST` — The Posthog host

## Supabase

### Setup

This project uses supabase for managing authentication and keeping track of
stripe subscriptions. We recommend for testing and local development to use a
local instance of supabase. The supabase-cli is the best way to do this.

Follow the [Supabase Documentation](https://supabase.com/docs/guides/cli/local-development) for more information. The project contains a `supabase/` folder that contains the scaffolding SQL migrations necessary for setting up the necessary tables. Once you have the supabase cli installed you can simply run the below command in the `tutor-gpt` folder and a local instance of Supabase will start up.

> NOTE: Local Supabase relies on docker so ensure docker is also running before running the below command

```bash
supabase start
```

Another, useful note about doing testing locally with supabase is that there is
no need to verify an account when it is created so you can create a new account
on the webui and then immediately sign in with it.

### Authentication

This application uses the new [Supabase SSR](https://supabase.com/docs/guides/auth/server-side) features and the PKCE authentication flow. So there are a
few setup steps required before the app works with Supabase.

The main change is that the email templates for authentication need to be
modified to perform the token exchange

Confirm Signup

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your user:</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
    >Confirm your email</a
  >
</p>
```

Invite User

```html
<h2>You have been invited</h2>

<p>
  You have been invited to create a user on {{ .SiteURL }}. Follow this link to
  accept the invite:
</p>
<p>
  <a
    href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/path-to-your-update-password-page"
    >Accept the invite</a
  >
</p>
```

Magic Link

```html
<h2>Magic Link</h2>

<p>Follow this link to login:</p>
<p>
  <a
    href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink"
    >Log In</a
  >
</p>
```

Change Email Address

```html
<h2>Confirm Change of Email</h2>

<p>
  Follow this link to confirm the update of your email from {{ .Email }} to {{
  .NewEmail }}:
</p>
<p>
  <a
    href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change"
  >
    Change Email
  </a>
</p>
```

Reset Password

```html
<h2>Reset Password</h2>

<p>Follow this link to reset the password for your user:</p>
<p>
  <a
    href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset"
    >Reset Password</a
  >
</p>
```

## Docker

A `Dockerfile` is included for convenience in self hosting an local development.
to build and run the image run the following commands

```bash
cd tutor-gpt/www
docker build -t tutor-gpt-web .
docker run --env-file .env.local -p 3000:3000 tutor-gpt-web
```
