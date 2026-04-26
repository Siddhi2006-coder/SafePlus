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

## Project: SafeSphere (artifact dir: `safepulse`)

Production-ready personal-safety app. Display name **SafeSphere**, scheme
`safesphere`. Artifact dir + slug + AsyncStorage keys remain `safepulse.*` to
preserve existing sessions / artifact paths.

### Mobile (`artifacts/safepulse`)
Expo SDK 54 / RN 0.81 with web preview at `/`. Calming lavender brand
(`#7c6cff`); SOS uses pink→orange gradient (`#ff4d6d → #ff7a3d`).

- Screens: `onboarding.tsx` (3-slide intro, gated by `safepulse.onboarded`),
  `(auth)/login|signup|verify`, tabs (`index` SOS, `contacts`, `helpers`,
  `history`, `settings`), `active.tsx`, `incident/[id].tsx`.
- `providers/SosProvider` — motion sampling (DeviceMotion / web events),
  risk-level driven countdown (4s high / 8s medium / 14s low), repeated
  trigger detection (`safepulse.triggerHistory`), offline location queue
  (`safepulse.locQueue`), evidence chunk simulation, route accumulation.
- Components: `PulseSosButton` (riskLevel pulse + countdown ring),
  `RiskBadge`, `DeliveryChip` (per-channel + retry/priority), `HelperCard`
  (alias / distance / ETA), `MiniMap` (route polyline via segment Views +
  accuracy ring — pure RN, no SVG / map libs).
- API hooks: queries always pass explicit `queryKey: getGet*QueryKey(...)`.

### Backend (`artifacts/api-server`)
Express 5. Routes: `auth`, `contacts`, `sos` (trigger fans out alerts ×
{sms,call,whatsapp,push} with priority + retry attempts; risk scoring in
`lib/risk.ts`; motion telemetry endpoint; `escalate-nearby` uses 5km
haversine + invites 3 closest available helpers), `location` & `media`
(AES-256-GCM at rest via `lib/crypto.ts`), `incidents` (history / detail /
stats / share-summary / responders), `responders` (availability toggle,
invitations list, accept/decline with ETA, anonymous alias).

### Schema additions (`lib/db/src/schema/`)
users: `helperAlias`, `responderStatus`, `lastLat/Lng`, `lastLocationAt`.
incidents: `riskScore`, `riskLevel`, `motionMaxSpeed`, `triggerCount24h`.
alerts: `priority`, `attempts`, `lastError`. New `responders` table:
incidentId, helperUserId, alias, status (invited/accepted/declined),
distanceKm, etaMinutes, respondedAt.

### Dev notes
- OpenAPI at `lib/api-spec/openapi.yaml`; run
  `pnpm --filter @workspace/api-spec run codegen` after edits.
- Test creds: `demo@safepulse.app` / OTP shown via `devOtp` in response.
- Web preview insets: top 67, bottom tab bar 84.
- Onboarding flag key: `safepulse.onboarded` (clear in storage to re-show).
