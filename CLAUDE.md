# Package Management

Use `bun` for all package management operations:
- Installing dependencies: `bun install`
- Adding packages: `bun add <package>`
- Removing packages: `bun remove <package>`
- Running scripts: `bun run <script>`
- Running tests: `bun test`

This project uses Bun workspaces with packages under `packages/`.

# Project Structure

```
tutor-gpt/
  packages/
    shared/           # @bloom/shared - Types, Zod schemas, constants
    frontend/         # @bloom/frontend - Vite + React SPA
    backend/          # @bloom/backend - Elysia + Bun API
  package.json        # Root workspace config
  tsconfig.base.json  # Shared TypeScript config
  bunfig.toml         # Bun workspace config
```

# Development

- Backend: `cd packages/backend && bun dev` (port 3001)
- Frontend: `cd packages/frontend && bun dev` (port 5173)
- Tests: `bun test` (runs all workspace tests)

# Legacy Next.js App

The existing Next.js app at the root is being migrated to the new packages.
It remains functional during the transition period.
