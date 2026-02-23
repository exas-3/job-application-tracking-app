# Job Application Tracking App

A focused full-stack project that demonstrates a production-style implementation of a job application tracker.

Live demo: `https://job-application-tracking-app.vercel.app/`

This app demonstrates:
- Product-focused UI with Tailwind + shadcn-style components
- Secure auth flow with Firebase Auth + HTTP-only session cookies
- Firestore data modeling, rules, and indexes
- Kanban workflow with drag-and-drop status updates
- Production-minded API patterns (validation, rate limiting, tests, CI/CD)

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Firebase Authentication (client + Admin SDK)
- Cloud Firestore
- Tailwind CSS v4
- dnd-kit
- Zod validation
- GitHub Actions + Vercel deploy workflows

## Scope

This repository is intentionally scoped as a practical project, not a full SaaS product.

Goal:
- Show clean architecture and implementation quality in a realistic app
- Demonstrate ownership across frontend, backend, auth, data, and deployment

Non-goals:
- Multi-tenant enterprise features
- Complex analytics/reporting pipelines
- Billing, role-based admin panels, or advanced workflow automation

## Project Structure

- `src/app` - routes, pages, API handlers
- `src/lib/firebase` - Firebase client/admin initialization + env parsing
- `src/lib/repositories` - repository interfaces + Firestore implementations
- `src/lib/auth` - session cookie helpers and auth lookup
- `src/lib/validation` - request schemas
- `tests` - API/auth tests
- `.github/workflows` - CI, deploy, security, release workflows

## Prerequisites

- Node.js 20+
- npm
- Firebase project
- Vercel project (for deploy workflows)

## Local Setup

1. Install dependencies:
```bash
npm ci
```

2. Copy env template:
```bash
cp .env.example .env
```

3. Fill `.env` with Firebase values.

4. Run development server:
```bash
npm run dev
```

Open `http://localhost:3000`.

You can use the live deployment instead:
- `https://job-application-tracking-app.vercel.app/`

## Environment Variables

### Client Firebase (required unless marked optional)

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (optional)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` (optional)
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional, Analytics)

### Server Firebase Admin (required)

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (store with escaped newlines, e.g. `\n`)

### Monitoring (optional)

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

## Where to Get Firebase Values

Use Firebase Console:

- Project settings (General):  
  `https://console.firebase.google.com/project/<your-project-id>/settings/general`
- Service accounts (Admin SDK key JSON):  
  `https://console.firebase.google.com/project/<your-project-id>/settings/serviceaccounts/adminsdk`

Mapping:

- Web app config provides:
  `apiKey`, `authDomain`, `projectId`, `appId`, `storageBucket`, `messagingSenderId`, `measurementId`
- Service account JSON provides:
  `project_id`, `client_email`, `private_key`

## Authentication Flow

1. User signs in on client via Firebase Auth.
2. Client sends ID token to `POST /api/session/login`.
3. Server creates `session` HTTP-only cookie.
4. Server routes use `getCurrentSession()` to verify cookie via Firebase Admin.
5. Logout uses `POST /api/session/logout`, revokes refresh tokens, clears cookie.

Implementation notes:
- Shows secure server-verified sessions (not client-only auth state)
- Demonstrates understanding of token exchange and cookie hardening

## Data Model (Firestore)

- `users/{uid}`
  - `email`, `name`, timestamps
- `applications/{id}`
  - `userId`, `company`, `role`, `status`, optional metadata, timestamps

Rules and indexes live in:
- `firestore.rules`
- `firestore.indexes.json`
- `firebase.json`

## API Overview

- `POST /api/register` - create Firebase Auth user + user profile doc
- `POST /api/session/login` - exchange ID token for session cookie
- `POST /api/session/logout` - clear/revoke session
- `GET /api/health` - authenticated health check
- `GET /api/applications?status=&limit=&cursor=` - list user-owned applications
- `POST /api/applications` - create application
- `PATCH /api/applications/:id` - update application if owned by user
- `DELETE /api/applications/:id` - delete application if owned by user

Most API routes include lightweight in-memory rate limiting and Zod validation.

## Engineering Highlights

- Frontend execution:
  component structure, state handling, optimistic updates, drag-and-drop UX
- Backend/API quality:
  schema validation, auth checks, ownership enforcement, error handling
- Cloud integration:
  Firebase Auth + Firestore Admin/Client SDK usage
- Delivery discipline:
  tests, lint/typecheck, GitHub Actions, and deployment workflow setup

## Scripts

- `npm run dev` - local development
- `npm run build` - production build
- `npm run start` - run built app
- `npm run lint` - eslint
- `npm test` - Node test runner with TSX loader

## CI/CD

GitHub Actions workflows:

- `CI` (`.github/workflows/ci.yml`)
  - lint, typecheck, tests
  - optional build when `RUN_BUILD_CHECK=true`
- `Deploy Preview` (`.github/workflows/deploy-preview.yml`)
  - PR preview deploy to Vercel (skips when Vercel secrets are missing)
- `Deploy Production` (`.github/workflows/deploy-prod.yml`)
  - deploy on `main` push (skips when Vercel secrets are missing)
- `Deploy Firestore Config` (`.github/workflows/firestore-deploy.yml`)
  - deploy rules/indexes on config changes (skips when Firebase secrets are missing)
- `Security` and `Release Tag Deploy`

### Required GitHub Secrets for Deploys

Vercel:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Firebase:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

Optional build-time secrets:
- `NEXT_PUBLIC_FIREBASE_*`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `SENTRY_*`

## Branch Protection Recommendation

Protect `main` and require at least:
- `CI / test`

Add deploy checks as required only after all deploy secrets are configured.
