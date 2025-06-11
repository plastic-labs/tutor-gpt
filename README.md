# Tutor-GPT

![Static Badge](https://img.shields.io/badge/Version-0.8.0-blue)
[![Discord](https://img.shields.io/discord/1076192451997474938?logo=discord&logoColor=%23ffffff&label=Bloom&labelColor=%235865F2)](https://discord.gg/bloombotai)
![GitHub License](https://img.shields.io/github/license/plastic-labs/tutor-gpt)
![GitHub Repo stars](https://img.shields.io/github/stars/plastic-labs/tutor-gpt)
[![X (formerly Twitter) URL](https://img.shields.io/twitter/url?url=https%3A%2F%2Ftwitter.com%2FBloomBotAI&label=Twitter)](https://twitter.com/BloomBotAI)
[![arXiv](https://img.shields.io/badge/arXiv-2310.06983-b31b1b.svg)](https://arxiv.org/abs/2310.06983)

Tutor-GPT is an LLM powered learning companion developed by [Plastic
Labs](https://plasticlabs.ai). It dynamically reasons about your learning needs
and _updates its own prompts_ to best serve you.

We leaned into theory of mind experiments and it is now more than just a
literacy tutor, it’s an expansive learning companion. Read more about how it
works [here](https://blog.plasticlabs.ai/blog/Theory-of-Mind-Is-All-You-Need).

Tutor-GPT is powered by [Honcho](https://honcho.dev) to build robust user
representations and create a personalized experience for each user.

The hosted version of `tutor-gpt` is called [Bloom](https://bloombot.ai) as a
nod to Benjamin Bloom's Two Sigma Problem.

Alternatively, you can run your own instance of the bot by following the
instructions below.

## Project Structure

The tutor-gpt project is a Next.js application using the app router.

- `app/` - the pages, layouts, and API routes
- `hooks/` - Custom hooks made for the front end
- `util/` - Various utility functions and integrations with external services
- `components/` - this contains a FullStack `Next.js` version of Tutor-GPT
- `supabase/` - contains SQL scripts necessary for setting up local supabase
- `scripts/` - Lifecycle scripts that help setup and sync the project

We use [pnpm](https://pnpm.io/) for dependency management.

The project also makes use of several third party services

- [Honcho](https://honcho.dev) for identity modeling and personalization
- [Supabase](https://supabase.com) for user authentication and database
- [Openrouter](https://openrouter.ai) for LLM integration
- [PostHog](https://posthog.com) for analytics
- [Stripe](https://stripe.com) for payments

## Installation

Clone the repo and install the necessary Node.js dependencies

```bash
git clone https://github.com/plastic-labs/tutor-gpt.git && cd tutor-gpt
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

**LLM**

- `AI_API_KEY` — The API key for the inference provider
- `AI_PROVIDER` — The name of the LLM inference provider
- `AI_BASE_URL` — An OpenAI compatible API endpoint for LLM inference
- `MODEL` — The LLM model to use for generating responses.

**Mistral**

- `MISTRAL_API_KEY` — The API key for Mistral OCR

**Honcho**

- `HONCHO_URL` — The URL for the Honcho instance to use
- `HONCHO_APP_NAME` — The name of the app in Honcho to use

**Supabase**

- `NEXT_PUBLIC_SUPABASE_URL` — The URL for your Supabase project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — The public API key for your Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY` — The service key for the Supabase project.
- `JWT_SECRET` — The secret key to use for signing JWT tokens

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
modified to perform the token exchange.

For usage with a local instance of supabase the appropriate email templates have
been setup in `./supabase/templates`

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
cd tutor-gpt
docker build -t tutor-gpt .
docker run --env-file .env.local -p 3000:3000 tutor-gpt
```

## Contributing

This project is completely open source and welcomes any and all open source contributions. The workflow for contributing is to make a fork of the repository. You can claim an issue in the issues tab or start a new thread to indicate a feature or bug fix you are working on.

Once you have finished your contribution make a PR pointed at the `staging` branch and it will be reviewed by a project manager. Feel free to join us in our [discord](http://discord.gg/bloombotai) to discuss your changes or get help.

Once your changes are accepted and merged into staging they will under go a period of live testing before entering the upstream into `main`

## License

Tutor-GPT is licensed under the GPL-3.0 License. Learn more at the [License file](./LICENSE)
