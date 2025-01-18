FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Install dependencies into temp directory
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb* /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb* /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Build stage
FROM base AS builder
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Build the app
ENV NODE_ENV=production
RUN bun run build

# Production stage
FROM base AS release
WORKDIR /app

# Copy production dependencies and built app
COPY --from=install /temp/prod/node_modules ./node_modules
COPY --from=builder /usr/src/app/.next/standalone ./
COPY --from=builder /usr/src/app/.next/static ./.next/static
COPY --from=builder /usr/src/app/public ./public

# Run as non-root user
RUN addgroup --system --gid 1001 bunjs
RUN adduser --system --uid 1001 bunapp
USER bunapp

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "run", "server.js"]
