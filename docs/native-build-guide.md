# Native Build Guide

## Current State

The repository includes a Capacitor native wrapper foundation:

- `capacitor.config.ts`
- `android/`
- `ios/`
- `native/www/index.html`
- `assets/icon.png` and `assets/splash.png` as native asset sources

The native shell is designed to point at the deployed Red String production origin through `CAPACITOR_SERVER_URL`. The local bundled page is only a placeholder so native sync commands can run before the production URL exists.

`npm run native:sync` has been verified locally for both Android and iOS project sync. `npm run native:doctor` reports Android ready on this machine and iOS blocked until Xcode is available on a Mac, which is expected for App Store signing.

Native launcher and splash assets have been generated into the Android and iOS projects from the Red String source artwork.

## Required Before Release Sync

Set:

```bash
CAPACITOR_SERVER_URL=https://your-production-origin.example
APP_PUBLIC_ORIGIN=https://your-production-origin.example
ADMIN_TOKEN=...
```

Then run:

```bash
npm run native:sync
```

## Android Release Path

1. Set production environment variables.
2. Run `npm run native:sync`.
3. Run `npm run native:open:android`.
4. Configure package signing in Android Studio.
5. Build an Android App Bundle.
6. Upload the `.aab` to Google Play Console.
7. Complete content rating, data safety, privacy policy, and closed testing requirements.

## iOS Release Path

1. Set production environment variables.
2. Run `npm run native:sync`.
3. Move to a Mac with Xcode.
4. Run `npm run native:open:ios`.
5. Configure bundle signing, team, capabilities, and deployment target.
6. Archive in Xcode.
7. Upload to App Store Connect.
8. Complete App Privacy, age rating, review notes, support URL, and screenshots.

## Validation Checklist

- Native shell opens the production origin, not localhost.
- Login/session persistence works inside the WebView.
- `/privacy`, `/terms`, `/support`, `/safety`, and `/data-safety` open inside the shell.
- Data export and account deletion work from `/settings`.
- Report and block actions work.
- `/admin/launch` is not included as a public user route in store screenshots.
- App icons render correctly in launcher/home screen.

## Known Manual Work

- Android signing keys.
- Apple developer team and signing certificates.
- Store screenshots from native devices/simulators.
- Push notification entitlement once provider is selected.
- Final legal review.
