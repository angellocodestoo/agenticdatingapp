# Red String App Store Readiness

## Current Launch Path

Ship the web/PWA product first, then wrap the same production URL in a native shell once the core flows, privacy controls, and safety review process are stable.

## Ready Now

- Production build passes.
- PWA manifest exists.
- App icons exist at 192, 512, and 1024 pixels.
- Privacy and Terms routes exist.
- Support, Safety, and Data Safety routes exist.
- Data export and account deletion exist.
- Admin safety review exists.
- Launch readiness dashboard exists at `/admin/launch`.

## Manual Review Before Submission

- Counsel review for `/privacy` and `/terms`.
- Final product screenshots for iPhone, iPad, Android phone, and Android tablet where applicable.
- App Store subtitle, keywords, promotional text, and support URL.
- Google Play short description, full description, data safety form, and content rating.
- Safety escalation policy for reports.
- Decision on whether launch uses PWA distribution, Capacitor wrapper, or dedicated native apps.

## Provider Decisions

- Configure Anthropic for production-quality persona and agent runs.
- Configure email notifications before inviting real users at scale.
- Configure SMS/phone masking before relying on real warm-up calls.
- Configure places provider before using live venue discovery.
- Configure calendar provider before asking users for real availability access.

## Store Listing Draft

- Name: Red String
- Subtitle: Fate, handled.
- Category: Lifestyle
- Secondary category: Social Networking or Productivity
- Age rating target: 17+ until moderation, reporting, and dating-safety policy are fully reviewed.
- Support URL: public production origin plus `/support`
- Privacy URL: public production origin plus `/privacy`
- Terms URL: public production origin plus `/terms`
- Safety URL: public production origin plus `/safety`
- Data safety URL: public production origin plus `/data-safety`

## Final Gate

Do not submit to public stores until:

1. `npm run lint` passes.
2. `npm run build` passes.
3. `npm audit --audit-level=moderate` passes.
4. `/api/health` returns `ok: true`.
5. `/admin/launch` has no `needs_config` items for required production choices.
6. Legal text has been reviewed.
7. Store screenshots and app icons have been validated in the store consoles.
