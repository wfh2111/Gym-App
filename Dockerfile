# Builds and runs the whole app as a single service: the Fastify API plus the Expo Router web
# export, served together (see apps/api/src/app.ts -> registerWebApp). Native mobile builds
# (iOS/Android) are not part of this image - it's the web + API deployment target only.

FROM node:22-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# Baked into the web bundle at build time - EXPO_PUBLIC_* vars are inlined, not read at runtime.
# An empty API URL makes every fetch relative, which is correct once the API serves this same
# build from its own origin. Billing stays in sandbox/mock mode since no RevenueCat project is
# configured for this deployment target.
ENV EXPO_PUBLIC_API_URL=""
ENV EXPO_PUBLIC_BILLING_MODE="sandbox"
RUN pnpm --filter @gym-app/api prisma:generate
RUN pnpm --filter @gym-app/api build
RUN pnpm --filter @gym-app/mobile exec expo export --platform web --output-dir ../api/public

FROM base AS runtime
WORKDIR /repo/apps/api
ENV NODE_ENV=production
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/public ./public
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/package.json ./package.json

EXPOSE 4000
# Applies any pending migrations against the platform's Postgres before starting - safe to run on
# every deploy (prisma migrate deploy is a no-op when there's nothing new to apply).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
