FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
RUN bun install --frozen-lockfile --production

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY package.json tsconfig.base.json ./

# Runtime
FROM base AS runtime
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/package.json ./
COPY --from=build /app/tsconfig.base.json ./

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["bun", "run", "packages/backend/src/index.ts"]
