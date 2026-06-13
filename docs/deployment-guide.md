# Red String Deployment Guide

## Deployment Target

The app is a Next.js application with local SQLite persistence. It can be deployed as a single-instance service with a persistent disk. For multi-instance production, move persistence to managed storage before inviting real users at scale.

## Required Environment Variables

- `APP_PUBLIC_ORIGIN`
- `ADMIN_TOKEN`
- `REDSTRING_DB_FILE` if not using `data/redstring.db`
- `CAPACITOR_SERVER_URL` before syncing native release builds

## Recommended Production Variables

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `RESEND_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `PLACES_PROVIDER`
- `PLACES_API_KEY`
- `CALENDAR_PROVIDER`
- `CALENDAR_CLIENT_ID`
- `CALENDAR_CLIENT_SECRET`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`

## Build Commands

```bash
npm install
npm run lint
npm run build
npm audit --audit-level=moderate
npm run start
```

## Native Wrapper Commands

```bash
npm run native:sync
npm run native:open:android
npm run native:open:ios
```

Set `CAPACITOR_SERVER_URL` to the deployed HTTPS origin before syncing release builds.

## Health Checks

- Liveness/readiness endpoint: `/api/health`
- Admin launch checklist: `/admin/launch`
- Admin safety queue: `/admin/safety`

`/api/health` returns HTTP 200 when the app and database are reachable. The JSON body still reports missing production configuration.

## Storage

The default database path is:

```text
data/redstring.db
```

Keep the `data` directory on persistent storage. SQLite is acceptable for a single-instance launch, but not for horizontally scaled app servers.

## Pre-Launch Checklist

1. Set `APP_PUBLIC_ORIGIN`.
2. Set `ADMIN_TOKEN`.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Run `npm audit --audit-level=moderate`.
6. Visit `/api/health`.
7. Visit `/admin/launch`.
8. Confirm privacy export works.
9. Confirm account deletion works on a test user.
10. Confirm safety reports appear in `/admin/safety`.

## Rollback

Keep a previous deployment available until:

- Login works.
- `/api/health` returns `ok: true`.
- The admin launch dashboard loads.
- The app can create a guest session.
- The app can read and write the database.
