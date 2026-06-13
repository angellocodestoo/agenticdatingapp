# Red String — App Store Submission Pack

Everything needed to submit to the Apple App Store and Google Play. Code-side
items are done; account/build items are marked **[you]**.

## App identity

| Field | Value |
|---|---|
| App name | Red String |
| Subtitle (iOS, 30 char) | Your agent finds your person |
| Bundle ID / appId | com.redstring.app |
| Category | Lifestyle (primary), Social (secondary) |
| Age rating | 17+ / Mature 17+ (dating) |
| Public URL | https://getredstring.com **[you: deploy]** |

## Description (both stores)

> Red String is agentic dating for people who want fewer, better first dates.
>
> Your AI agent learns who you really are — from your calendar, music, activity
> data, and your own words — then goes out, screens everyone nearby, talks to
> other people's agents, and only surfaces matches worth your evening. It books
> the date and preps a warm-up call. You skip the swiping.
>
> • A persona built from your real life, not a bio you labor over
> • Agent-to-agent conversations that probe real compatibility
> • Mutual interest required — no one-sided matches
> • Life-stage aware matching that respects what you actually want
> • Learns from every date you rate
>
> Fewer, better first dates. That's the whole idea.

## Keywords (iOS, 100 char)

`dating,ai,agent,matchmaker,relationships,singles,match,date,love,compatibility`

## Required URLs

- Privacy policy: `/privacy` → https://getredstring.com/privacy
- Terms of service: `/terms` → https://getredstring.com/terms
- Support: `/support` → https://getredstring.com/support
- Data safety / deletion: `/data-safety` (account deletion in Settings → `/api/privacy`)

## Done (code-side)

- [x] PWA manifest + icons (`src/app/manifest.ts`, `public/icon-*.png`)
- [x] Capacitor wrapper, iOS + Android projects synced
- [x] Native app icons + splash (all sizes, `@capacitor/assets`)
- [x] iOS permission usage strings (photo library, camera) in `Info.plist`
- [x] iOS Privacy Manifest (`PrivacyInfo.xcprivacy`)
- [x] `ITSAppUsesNonExemptEncryption=false` (skips export-compliance prompt)
- [x] Privacy policy, terms, support, data-safety pages
- [x] In-app account deletion + data export (`/api/privacy`, Settings)
- [x] Content moderation + rate limiting (`src/lib/guardrails.ts`)
- [x] Safety reporting + blocking
- [x] Age field enforces 18+ minimum

## Apple App Privacy answers (App Store Connect questionnaire)

Data collected, all **linked to user, not used for tracking**, purpose **App Functionality**:
Email, Name, Photos, Sensitive Info (dating preferences), Coarse Location (search radius), User Content.

## [you] — requires accounts / a Mac

1. **Deploy** the web app to HTTPS; set `CAPACITOR_SERVER_URL` to it, `npx cap sync`.
2. **Apple**: Developer Program ($99/yr). On a Mac: `npx cap open ios`, set signing
   team + bundle ID, archive, upload to App Store Connect.
3. **Google**: Play Console ($25 once). `npx cap open android`, generate signed AAB.
4. **Listing assets**: screenshots (iOS 6.7"+6.5", Android phone+tablet), feature graphic.
5. **App Store Connect**: paste metadata above, complete App Privacy + age rating,
   answer the 17+ dating content questions.
6. **Demo account** for reviewers (Apple requires login access).
