# Native Wrapper Decision

## Recommendation

Use a PWA-first launch for initial production validation, with the Capacitor wrapper already scaffolded for iOS and Android. Ship the native shells once provider credentials, privacy review, signing, and safety operations are stable.

## Why PWA First

- The current product is already a complete Next.js application.
- Most Phase 1 through Phase 4 value is account, data, and workflow driven, not native-device driven.
- PWA launch lets the team test onboarding, safety reports, relationship flows, and legacy flows faster.
- Store review risk is lower once real moderation, privacy, support, and deletion flows have been exercised.

## Why Capacitor Next

- Reuses the production web app.
- Enables native store distribution without rebuilding the product in Swift/Kotlin.
- Provides a path to push notifications, deep links, app icons, and splash screens.
- Keeps one core product surface while the model and provider layers are still changing.

## Native Features Needed Later

- Push notifications.
- Universal/deep links.
- Native share sheet for invites.
- Photo library and camera polish.
- App icon and splash screen assets.
- Optional calendar access if provider strategy requires device permissions.

## Decision Gate

Move from PWA to Capacitor when:

1. Production origin is deployed.
2. Privacy and Terms are counsel-reviewed.
3. Admin safety process is staffed.
4. Notification provider is configured.
5. Store screenshots and icon assets are final.
6. The launch readiness dashboard shows no required `needs_config` items.

## First Capacitor Tasks

1. Add Capacitor packages. Done.
2. Configure app id, name, icon, and release URL. Done.
3. Add iOS and Android projects. Done.
4. Point native shell at the deployed production origin with `CAPACITOR_SERVER_URL`.
5. Validate login/session persistence inside the shell.
6. Validate privacy export/delete from the shell.
7. Capture store screenshots from the native builds.
