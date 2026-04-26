# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: SafePulse

Personal-safety mobile app with one-tap SOS, real-time location, multi-channel
alerts, evidence capture and auto-escalation. Stack:

- **`artifacts/safepulse`** — Expo (React Native) mobile app w/ web preview at `/`.
  Lavender→blue calming UI. Screens: auth (`(auth)/login|signup|verify`), tabs
  (`(tabs)/index` SOS, `contacts`, `history`, `settings`), `active.tsx` for live
  incident, `incident/[id].tsx` for detail. State via `providers/AuthProvider`
  (AsyncStorage-backed token + user) and `providers/SosProvider` (active
  incident polling, 8s escalation countdown, recurring location push, voice
  trigger via web SpeechRecognition).
- **`artifacts/api-server`** — Express 5 API. Local OTP auth (scrypt + bearer
  tokens). Routes under `src/routes/`: `auth`, `contacts`, `sos` (trigger
  fans out alerts × {sms,call,whatsapp,push}; escalate-nearby uses 5km
  haversine on users with `lastLocationAt` ≤ 24h), `location`, `media`
  (base64 inline), `incidents` (history/detail/stats).
- **DB schema** in `lib/db/src/schema/`: users, sessions, otpChallenges,
  contacts, incidents, locations, media, alerts.
- **OpenAPI spec** at `lib/api-spec/openapi.yaml`. Run
  `pnpm --filter @workspace/api-spec run codegen` after edits.

OTP returns `devOtp` in response (no SMS gateway). The mobile client
auto-fills it on the verify screen and shows a small dev-mode badge.
