# AGENTS.md

## Overview
This repository contains a Next.js application with a focus on AI-powered features, likely related to a chat or tutoring platform. Below is a breakdown of the key components and structure of the repo:

### Directory Structure
- **`app/`**: Contains the main application code, including API routes, actions, and pages.
- **`components/`**: Houses reusable UI components, organized into subdirectories like `auth/`, `messages/`, `settings/`, and `ui/`.
- **`hooks/`**: Custom React hooks for managing state and side effects.
- **`public/`**: Static assets like images, icons, and configuration files.
- **`supabase/`**: Supabase-related configurations and migrations.
- **`tests/`**: Test cases for the application.
- **`utils/`**: Utility functions and helpers, including AI-related logic, Supabase interactions, and more.
- **`assets/`**: Additional static assets.
- **`scripts/`**: Scripts for automation or data processing.
- **`fonts/`**: Custom font files.

### Key Files
- **`package.json`**: Lists dependencies and scripts for the project.
- **`pnpm-lock.yaml`**: Lockfile for managing exact dependency versions.
- **`tsconfig.json`**: TypeScript configuration.
- **`next.config.ts`**: Next.js configuration.
- **`eslint.config.mjs`**: ESLint configuration for code linting.
- **`postcss.config.js`**: PostCSS configuration for styling.
- **`vitest.config.ts`**: Vitest configuration for testing.

### Technologies Used
- **Next.js**: Framework for building the application.
- **TypeScript**: Language for type-safe development.
- **Supabase**: Backend service for database and authentication.
- **Stripe**: Payment processing.
- **ESLint & PostCSS**: Tools for code linting and styling.
- **Vitest**: Testing framework.

### Features
- **AI Integration**: Utilities for AI-powered features like conversation handling, prompts, and PDF processing.
- **Authentication**: Components and logic for user authentication, including OAuth providers like Google and Discord.
- **Settings Management**: Components for managing user settings, including account, security, subscription, and support settings.
- **Chat Interface**: Components for displaying AI and user messages in a chat-like interface.

### Testing
- The `tests/` directory contains test cases, including a setup file and specific tests like `pdfChat.test.ts`.
- The `vitest.config.ts` file configures the testing environment.

### Styling
- The application uses a combination of CSS and CSS-in-JS for styling.
- The `globals.css` file contains global styles, while individual components may have their own styling.

### Additional Notes
- The repository includes Docker configuration files (`Dockerfile` and `docker-compose.yaml`) for containerization.
- The `LICENSE` file indicates the project's licensing terms.
- The `README.md` and `CHANGELOG.md` files provide additional documentation and release notes.

This overview should help you understand the structure and purpose of the repository.