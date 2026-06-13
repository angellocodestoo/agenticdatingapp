# Red String Production Launch PRD

## Summary

This track turns Red String from a local prototype into a launchable product foundation. The immediate target is a shippable mobile-friendly web/PWA product that can later be wrapped for native app stores with Capacitor or a dedicated native shell.

## Launch Goals

1. Make production readiness visible through health and configuration checks.
2. Add privacy export and account deletion controls.
3. Add provider seams for notifications, calendar, places, and phone masking.
4. Add admin safety review tooling.
5. Add app metadata needed for installable mobile/PWA packaging.
6. Document deployment and App Store readiness gaps honestly.

## Non-Goals

- No real legal advice or compliance certification.
- No real payment processing until pricing is finalized.
- No native iOS/Android shell in this tranche.
- No real SMS/email sending without provider credentials.

## Build Sequence

### Section 1 - Production Primitives

- App manifest and mobile metadata.
- Health endpoint.
- Runtime configuration report.
- Privacy export.
- Account deletion.
- Notification provider abstraction.
- Admin safety review endpoint.

### Section 2 - Launch Operations

- Deployment guide.
- Environment validation.
- Error logging helper.
- Admin dashboard UI.
- Report review status.

### Section 3 - App Store Readiness

- PWA install polish.
- App icon and screenshots checklist.
- Privacy policy and terms pages.
- Native wrapper decision doc.
- Store submission checklist.

## Definition Of Done

- Production checks exist and are documented.
- User data export/delete exists.
- Admin safety review exists.
- App manifest exists.
- README documents launch path and remaining native-store work.
- Lint, build, and audit pass.

