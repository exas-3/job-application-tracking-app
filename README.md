# job-application-tracking-app

Kanban style dashboard to track your job applications.

## Stack

- Next.js 16
- Firebase Authentication
- Cloud Firestore

## Environment

Copy `.env.example` to `.env` and set all Firebase values:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (optional)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` (optional)
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional, for Analytics)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (use escaped newlines: `\n`)

## Auth model

- Client signs in with Firebase Auth.
- Client sends ID token to `/api/session/login`.
- Server creates an HTTP-only Firebase session cookie.
- Protected pages/API verify the session cookie with Firebase Admin SDK.
