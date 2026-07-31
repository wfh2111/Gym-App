# Gym App

A mobile-first health and fitness app that unifies nutrition tracking, workout tracking,
recovery, and supplementation into one AI-coached experience. Conversational onboarding builds a
user profile, an LLM generates a personalized nutrition/training/recovery/supplement plan, and
the plan re-adapts weekly based on logged adherence and (for Premium users) wearable recovery
data.

## Stack

- **Mobile**: React Native + Expo (Expo Router, TypeScript, React Query, Zustand)
- **Backend**: Fastify + Prisma + PostgreSQL
- **LLM**: Anthropic API (Claude), used for onboarding extraction, plan generation, and coach chat
- **Wearables**: Whoop and Oura (OAuth2), Garmin (OAuth1.0a), Apple Health and Google Fit (native
  modules)
- **Billing**: RevenueCat, with a sandbox/mock mode for testing the paid tier without a real
  App Store/Play Store project

## Repo structure

```
apps/
  api/      Fastify + Prisma backend
  mobile/   Expo Router app
packages/
  shared/   zod schemas, DTOs, and domain logic shared between api and mobile
```

## Prerequisites

- Node.js 20+
- pnpm 10 (`corepack enable` will pick up the pinned version from `package.json`)
- A local PostgreSQL instance (or any reachable Postgres)

## Setup

```bash
pnpm install

# apps/api/.env - copy and fill in at minimum DATABASE_URL and JWT_SECRET
cp apps/api/.env.example apps/api/.env

# apps/mobile/.env - copy as-is to start; defaults point at localhost:4000 in sandbox billing mode
cp apps/mobile/.env.example apps/mobile/.env

pnpm db:migrate   # prisma migrate dev - creates the schema
pnpm db:seed      # exercise catalog + a demo account

pnpm dev          # runs the API and the Expo dev server together
```

`pnpm dev` starts both `apps/api` (port 4000) and `apps/mobile` (Expo dev server). Use
`pnpm dev:api` / `pnpm dev:mobile` to run either alone. For the mobile app on a physical device
via Expo Go, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your machine's LAN IP instead of
`localhost`.

### Demo account

The seed script creates `demo@gymapp.dev` / `password123` with a completed onboarding, an active
plan, and some logged history, so you can explore the app without going through onboarding first.

## Deploying to a public URL

The root `Dockerfile` builds a single deployable service: the Fastify API, plus the Expo Router
web app exported as static files and served by that same API (see `registerWebApp` in
`apps/api/src/app.ts`). One image, one process, one URL - no separate static host, no CORS setup
needed since everything is same-origin. Native (iOS/Android) builds aren't part of this image;
this is the web + API deployment target.

**[Railway](https://railway.app)** is the easiest fit, since one project can host both this
service and a Postgres database:

1. Create a new Railway project, add a **Postgres** database to it (Railway provisions
   `DATABASE_URL` automatically and injects it into other services in the same project).
2. Add a second service from this GitHub repo/branch. Railway auto-detects the root `Dockerfile`
   (a `railway.json` is included to pin the healthcheck to `/health`).
3. Set these variables on the service (Postgres's `DATABASE_URL` is already there if you
   reference it from the Postgres plugin, e.g. `${{Postgres.DATABASE_URL}}`):
   - `JWT_SECRET` - any long random string
   - `NODE_ENV=production`
   - Optionally `ANTHROPIC_API_KEY` to get real LLM output instead of graceful 503s (see Known
     limitations)
   - Optionally the `WHOOP_*` / `OURA_*` / `GARMIN_*` / `REVENUECAT_*` vars from
     `apps/api/.env.example` if you have real credentials for those
4. Deploy. The container runs `prisma migrate deploy` on every start (safe - it's a no-op once
   the schema is current) before starting the server, so the database schema is created
   automatically on first deploy.
5. Seed the exercise catalog and demo account once, from a shell attached to the running service
   (the "Shell" tab in Railway's dashboard, or `railway run` locally with the Railway CLI linked
   to the project): `npx tsx prisma/seed.ts` from the service's working directory (`apps/api`).
6. Open the URL Railway gives the service - that's the whole app, in a browser, from anywhere.

Billing defaults to sandbox/mock mode in this build (no `REVENUECAT_*` vars set), so the paywall
is fully clickable but nothing is charged - see Known limitations below.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | API + mobile dev servers together |
| `pnpm typecheck` | `tsc --noEmit` across all packages |
| `pnpm lint` | ESLint across all packages |
| `pnpm db:migrate` | `prisma migrate dev` (interactive; creates a new migration if the schema changed) |
| `pnpm db:seed` | Exercise catalog + demo account |
| `pnpm db:studio` | Prisma Studio |
| `pnpm --filter @gym-app/api job:regenerate-plans` | Manually run the weekly plan-regeneration job (also syncs wearable recovery data first) |

That script mirrors what `ENABLE_CRON=true` schedules automatically in
`apps/api/src/jobs/scheduler.ts` - useful for exercising the weekly regeneration logic on demand
instead of waiting for the actual schedule. In development, the same jobs are also reachable over
HTTP via `POST /api/admin/jobs/regenerate-plans` and `POST /api/admin/jobs/sync-recovery`
(disabled when `NODE_ENV=production`).

## Environment variables

See `apps/api/.env.example` and `apps/mobile/.env.example` for the full list with inline
comments. The short version:

- **Core** (`DATABASE_URL`, `JWT_SECRET`) - required.
- **`ANTHROPIC_API_KEY`** - powers onboarding extraction, plan generation, and coach chat. Without
  it, those endpoints respond with a graceful 503 rather than failing hard (see Known limitations
  below).
- **`WHOOP_*` / `OURA_*` / `GARMIN_*`** - OAuth credentials per wearable provider. Leave blank to
  disable that provider's connect flow (it still shows in the UI, but `/connect` fails cleanly).
- **`REVENUECAT_*`** - leave blank for sandbox/mock billing (the default); set both to switch the
  backend to verifying real RevenueCat entitlements.
- **`EXPO_PUBLIC_BILLING_MODE`** - mobile-side switch between the mock paywall flow (`sandbox`,
  the default) and the real RevenueCat SDK (`live`, also requires
  `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`).

## Architecture notes

- **Onboarding** (`apps/mobile/app/onboarding`, `apps/api/src/services/llm`) is a conversational
  flow, not a form - the LLM asks follow-ups for vague answers and emits a structured profile via
  forced tool use once it has enough to build a plan.
- **Plan generation** (`planGeneration.service.ts`) produces nutrition targets, a periodized
  training split, a recovery protocol, and general (non-medical) supplement category suggestions
  in one pass, then persists them as a versioned `PlanVersion`.
- **Training progression** (`packages/shared/src/domain/progression.ts`) is a pure domain
  function - double progression (reps first, then load) computed from the previous session's
  logged sets, independent of the LLM.
- **Weekly regeneration** (`apps/api/src/jobs/planRegeneration.job.ts`) re-syncs wearable data,
  computes the past week's adherence, and regenerates the plan for Premium users automatically.
  Free users still get plan updates, but only through the weekly check-in conversation with the
  coach, not this automatic job.
- **Wearable integrations** (`apps/api/src/integrations`) - Whoop/Oura use OAuth2; Garmin uses a
  hand-rolled OAuth1.0a signer (`integrations/oauth1.ts`), since Garmin Connect predates OAuth2.
  Apple Health / Google Fit are on-device native modules (`apps/mobile/src/integrations`) with no
  OAuth step - just an OS permission prompt, then a direct sync to the backend.
- **Monetization** (`apps/api/src/services/billing.service.ts`,
  `apps/mobile/src/lib/purchases.ts`) - entitlement is derived from a `Subscription` row kept in
  sync by RevenueCat webhooks (source of truth) plus an optional client-triggered re-check against
  RevenueCat's REST API. Free-tier coach chat is capped at `FREE_COACH_MESSAGES_PER_WEEK`
  messages/week; Premium unlocks unlimited chat, the automatic weekly adaptive plan, and
  wearable-informed recovery adjustments.

## Known limitations of this build

Everything below is implemented as real, production-shaped code - not stubs - but some of it
could only be verified structurally (typecheck, lint, code review, and for the mobile app, a real
Metro bundle export for iOS/Android/Web) rather than against live third-party services, because
this was built in a sandboxed environment without real credentials for any of them:

- **LLM features** (onboarding, plan generation, coach chat) were verified for correct 503
  degradation without an `ANTHROPIC_API_KEY`, but not against real model output, since no key was
  available in this environment. Set `ANTHROPIC_API_KEY` to exercise them for real.
- **Whoop/Oura/Garmin OAuth** - the connect/callback/token-exchange/data-fetch flows are real
  implementations against each provider's documented API, but were only verified up to the point
  of generating a correct authorization URL (no real developer app credentials to complete an
  actual OAuth round-trip).
- **Apple Health / Google Fit** - these are native modules (`react-native-health`,
  `react-native-google-fit`) that don't run in Expo Go; a real device build via `expo prebuild`
  is required to exercise them. Verified via a full Metro bundle export for both platforms (the
  JS side resolves and bundles correctly) and code review against each library's documented API,
  not on a physical device or simulator.
- **RevenueCat** - the webhook handler, entitlement sync, and SDK wiring are real, but there's no
  RevenueCat project configured in this build, so it defaults to the sandbox/mock mode described
  above. The full mock purchase → entitlement → downgrade cycle was verified end-to-end in a real
  browser session against the live backend; the real (non-mock) RevenueCat REST verification path
  and real IAP purchase flow are implemented but unverified against an actual account.
- **Barcode nutrition lookup** (Open Food Facts) - implemented and correct, but this sandbox's
  network egress policy blocks `world.openfoodfacts.org`, so it couldn't be exercised end-to-end
  here. It works against a normal internet connection.

Three bugs unrelated to any specific feature were found and fixed while doing real end-to-end
verification (live browser sessions and an actual production build/run, not just typecheck) of the
above:

- The mobile API client sent `Content-Type: application/json` on every request, which Fastify
  rejects on bodyless POST/DELETE calls.
- `@babel/runtime` wasn't hoisted into the mobile workspace under pnpm's strict linking, which
  broke every real Metro bundle.
- The documented production build (`pnpm build && pnpm start`) had never actually been run before
  this - esbuild's ESM output doesn't shim `require`/`__dirname` for bundled CJS dependencies that
  need them (Fastify's `avvio`, `node-cron`), so the bundled server crashed immediately on
  startup.

All three are fixed at the root cause (`apps/mobile/src/lib/api.ts`, `apps/mobile/package.json`,
and the `build` script in `apps/api/package.json` respectively), not worked around per call site.
