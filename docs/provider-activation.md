# Provider Activation Guide

## Goal

Red String can run locally with scripted and mock providers, but a public launch should activate real providers deliberately. Use `/admin/providers` to see exactly which credentials are configured.

## Recommended Launch Order

1. `APP_PUBLIC_ORIGIN`
2. `ADMIN_TOKEN`
3. `ANTHROPIC_API_KEY`
4. `RESEND_API_KEY`
5. `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
6. `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
7. `PLACES_PROVIDER`, `PLACES_API_KEY`
8. `CALENDAR_PROVIDER`, `CALENDAR_CLIENT_ID`, `CALENDAR_CLIENT_SECRET`
9. `PUSH_PROVIDER`, `PUSH_API_KEY`

## Provider Notes

### Anthropic

Used for production-quality persona generation and agent conversation. Without it, the app uses the scripted local engine.

### Resend

Recommended first email provider. Use for account, invite, relationship, household, and legacy lifecycle emails. Add `NOTIFICATION_FROM_EMAIL` when the sending domain is verified.

### Twilio

Used for SMS reminders and masked-call production behavior. Keep warm-up call language conservative until carrier compliance is reviewed.

### Spotify

Used for real listening-signal onboarding. Redirect URI should be:

```text
<APP_PUBLIC_ORIGIN>/api/connect/spotify/callback
```

### Places

Used for live venue discovery. The app currently expects `PLACES_PROVIDER` and `PLACES_API_KEY`; the concrete provider can be Google Places, Foursquare, Yelp Fusion, or another provider once the production choice is made.

### Calendar

Used for real availability windows. The app currently expects `CALENDAR_PROVIDER`, `CALENDAR_CLIENT_ID`, and `CALENDAR_CLIENT_SECRET`; OAuth consent copy must match the store privacy disclosures.

### Push

Used after native wrapper launch. Do not enable until APNs/FCM credentials and native permissions copy are reviewed.

## Verification

After adding credentials:

1. Run `npm run lint`.
2. Run `npm run build`.
3. Run `npm audit --audit-level=moderate`.
4. Open `/api/health`.
5. Open `/admin/providers`.
6. Open `/admin/launch`.
7. Test the user-facing flow that uses the provider.
