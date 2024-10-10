# Tutor-GPT Web UI

This directory contains the code for the web-ui of Tutor-GPT. It is developed
using [Next.js](https://nextjs.org/) and [pnpm](https://pnpm.io).

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Supabase

Additionally, this project uses supabase for managing different users,
authentication, and as the database for holding message and conversation
information. We recommend for testing and local development to use a local instance of supabase. The supabase-cli is the best way to do this.

Follow the [Supabase Documentation](https://supabase.com/docs/guides/cli/local-development) for more information. The project contains a `supabase/` folder that contains the scaffolding SQL migrations necessary for setting up the necessary tables. Once you have the supabase cli installed you can simply run the below command in the `tutor-gpt` folder and a local instance of Supabase will start up.

> NOTE: Local Supabase relies on docker so ensure docker is also running before running the below command

```bash
supabase start
```

Another, useful note about doing testing locally with supabase is that there is
no need to verify an account when it is created so you can create a new account
on the webui and then immediately sign in with it.

## Supabase Setup

This application uses the new [Supabase SSR](https://supabase.com/docs/guides/auth/server-side) features and the PKCE authentication flow. So there are a
few setup steps required before the app works with Supabase.

The main change is that the email templates for authentication need to be
modified to perform the token exchange

### Email Templates

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

## Environment Variables

The `NextJS` application in `www/` also has it's own environment variables which are usually held in the .env.local file. There is another `.env.template` file that you can use for getting started. These are explaing below.

- **NEXT_PUBLIC_URL**: The url the web application will be accessible the default with `NextJS` is http://localhost:3000
- **NEXT_PUBLIC_API_URL**: The url the api backend will be run from the default for `FastAPI is` http://localhost:8000
- **NEXT_PUBLIC_SUPABASE_URL**: The url for your supabase project should be identical to the one used in the python backend
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: The API key for supabase this time it is the anon key NOT the service key
- **NEXT_PUBLIC_SENTRY_DSN**: Optional for sentry bug tracking
- **NEXT_PUBLIC_SENTRY_ENVIRONMENT**: Optional for sentry bug tracking
- **NEXT_PUBLIC_POSTHOG_KEY**: Optional Posthog event tracking
- **NEXT_PUBLIC_POSTHOG_HOST**: Option for Posthog event tracking
