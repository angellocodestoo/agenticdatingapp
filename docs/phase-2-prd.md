# Red String Phase 2 PRD - Early Relationship Copilot

## Summary

Phase 2 turns Red String from a first-date agent into an early-relationship copilot. Once two people mutually opt in after a promising match, Red String creates a shared relationship space where both partners can coordinate time, understand each other's communication styles, preserve consent boundaries, and turn dating momentum into a stable relationship rhythm.

Phase 1 answered: "Who should I meet, and how do we get to a good first date?"

Phase 2 answers: "Now that we are choosing each other, how do we make the relationship easier to build?"

## Product Positioning

Red String should feel like a private operating system for two people learning how to become a couple. It is not therapy, surveillance, or a social feed. It is a calm coordination layer that helps partners protect attention, notice patterns, plan meaningful time, and resolve small frictions before they become identity-level conflict.

## Phase 2 Goals

1. Convert successful Phase 1 matches into a shared relationship workspace.
2. Give both partners equal consent, visibility, and control.
3. Help couples coordinate dates, check-ins, and quality time.
4. Personalize communication guidance from each partner's persona, stated preferences, and feedback.
5. Detect lightweight friction signals from explicit check-ins and scheduling patterns.
6. Measure relationship health without making the product feel clinical.
7. Preserve trust by avoiding invasive monitoring, private-message scraping, or unilateral partner tracking.

## Non-Goals

- No marriage, household, children, finance, legal, or family operations yet.
- No passive monitoring of private messages, calls, email, or social accounts.
- No therapy claims or mental-health diagnosis.
- No unilateral relationship workspace. Both partners must opt in.
- No AI-generated manipulation scripts or pressure tactics.

## Target User Journey

### 1. Match Graduates

A user completes a date and submits positive feedback. If the match lifecycle has mutual interest and the post-date outcome is promising, Red String offers to "open relationship mode."

### 2. Partner Invitation

The initiating user sends an invitation. The other partner sees what relationship mode includes before accepting. Both partners can decline, pause, or leave.

### 3. Shared Workspace

Once both opt in, Red String creates a couple space with:

- Shared relationship profile
- Partner preferences
- Upcoming date plans
- Check-ins
- Communication guidance
- Friction signals
- Relationship timeline

### 4. Weekly Rhythm

The copilot asks for lightweight check-ins, suggests quality-time windows, recommends date ideas, and summarizes patterns both partners have agreed to share.

### 5. Learning Loop

After dates, check-ins, or conflicts, both partners can give feedback. The agent updates communication guidance and planning recommendations.

## Core Capabilities

### Relationship Mode Conversion

Users can convert a Phase 1 match lifecycle into a Phase 2 relationship workspace only when:

- The candidate is a real user-owned candidate.
- Mutual interest is accepted.
- A date proposal exists or post-date feedback exists.
- Neither partner has blocked or reported the other.
- Both partners explicitly consent.

### Partner Consent System

Each partner has an independent membership record:

- `invited`
- `accepted`
- `paused`
- `left`
- `removed_for_safety`

The relationship space is active only when both partners are accepted. If either pauses, shared recommendations stop and the UI shows the paused state.

### Relationship Profile

The relationship profile stores shared information:

- Relationship stage
- Start date or first-date date
- Shared values
- Quality-time preferences
- Communication norms
- Planning cadence
- Sensitive topics to avoid
- Shared goals for the next 30 days

### Partner Preference Cards

Each partner can define preferences that are visible to the other partner:

- Best communication channel
- Ideal response-time expectations
- Planning style
- Affection style
- Conflict repair preference
- Date-night preferences
- Alone-time needs
- Topics that require extra care

### Shared Planner

The planner builds on Phase 1 logistics providers and supports:

- Date night suggestions
- Check-in reminders
- Quality-time windows
- Rescheduling
- Shared plan status
- Partner acceptance

Provider behavior remains mock/local until production integrations are added.

### Communication Guidance

The agent generates suggestions from explicit preferences and relationship context:

- How to ask for time together
- How to repair after missed plans
- How to raise a sensitive topic
- How to celebrate wins
- How to make date plans that match both styles

Guidance must be framed as suggestions, not scripts to manipulate an outcome.

### Check-Ins

Each partner can submit short check-ins:

- Mood
- Closeness
- Energy
- Stress
- Appreciation
- Need
- Optional note

Partners choose what parts are shared. The app can show an aggregated couple trend only when both partners participate.

### Friction Signals

The app can surface non-diagnostic signals:

- Many declined plans
- Repeated schedule mismatch
- Lower closeness trend
- High stress trend
- Missed weekly rhythm
- Communication preference mismatch

The system must recommend small repair actions, not label the relationship as failing.

### Relationship Timeline

The timeline shows key milestones:

- First match
- First date
- Relationship mode created
- Date nights
- Check-ins
- Shared goals
- Positive feedback moments

Safety actions and private notes should not appear on the shared timeline.

## Required Screens

### Match Detail Upgrade Entry

Add a relationship-mode call to action on eligible match pages.

States:

- Not eligible
- Eligible to invite
- Invitation pending
- Partner accepted
- Relationship active
- Paused
- Safety blocked

### Relationship Dashboard

New route: `/relationship`

Primary modules:

- Active relationship summary
- Next shared plan
- Weekly check-in prompt
- Communication guidance
- Friction signals
- Timeline preview

### Relationship Settings

New route: `/relationship/settings`

Controls:

- Partner preferences
- Sharing settings
- Pause relationship mode
- Leave relationship mode
- Safety actions

### Shared Planner

New route: `/relationship/planner`

Capabilities:

- View suggested date windows
- Suggest a plan
- Accept or decline plans
- Add check-in cadence
- Mark plan complete

### Check-In Flow

New route: `/relationship/check-in`

Capabilities:

- Submit check-in
- Choose sharing level
- See latest shared trend
- Receive a small next action

## API Requirements

### `POST /api/relationships`

Creates an invitation from an eligible match lifecycle.

Request:

- `matchLifecycleId`

Response:

- Relationship record
- Current membership status

### `GET /api/relationships`

Returns the current user's relationship spaces and membership state.

### `PATCH /api/relationships/[id]`

Updates relationship profile fields and stage.

### `POST /api/relationships/[id]/members/respond`

Accepts, declines, pauses, resumes, or leaves relationship mode.

### `GET /api/relationships/[id]/plans`

Returns shared plans.

### `POST /api/relationships/[id]/plans`

Creates a suggested or user-authored shared plan.

### `PATCH /api/relationships/[id]/plans/[planId]`

Accepts, declines, reschedules, or completes a plan.

### `POST /api/relationships/[id]/check-ins`

Creates a partner check-in with sharing settings.

### `GET /api/relationships/[id]/insights`

Returns communication guidance, trend summaries, and friction signals.

## Data Model

### `relationships`

- `id`
- `source_match_lifecycle_id`
- `created_by_user_id`
- `stage`
- `status`
- `created_at`
- `updated_at`
- `json`

### `relationship_members`

- `id`
- `relationship_id`
- `user_id`
- `candidate_id`
- `status`
- `sharing_level`
- `created_at`
- `updated_at`
- `json`

### `relationship_plans`

- `id`
- `relationship_id`
- `created_by_user_id`
- `type`
- `status`
- `scheduled_for`
- `created_at`
- `updated_at`
- `json`

### `relationship_check_ins`

- `id`
- `relationship_id`
- `user_id`
- `sharing_level`
- `created_at`
- `json`

### `relationship_events`

- `id`
- `relationship_id`
- `user_id`
- `name`
- `created_at`
- `json`

## Analytics

Track server-side events for:

- Relationship invitation created
- Relationship invitation accepted
- Relationship invitation declined
- Relationship mode paused
- Relationship mode resumed
- Relationship mode left
- Partner preferences updated
- Plan suggested
- Plan accepted
- Plan declined
- Plan completed
- Check-in submitted
- Friction signal surfaced
- Guidance viewed
- Safety action taken from relationship mode

Success metrics:

- Match-to-relationship conversion rate
- Invitation acceptance rate
- Weekly active relationship spaces
- Check-in participation rate
- Plan acceptance rate
- Completed quality-time plans
- User-reported relationship usefulness
- Safety incident rate

## Trust And Safety

Phase 2 must preserve explicit consent:

- Both users must opt in before relationship mode activates.
- Either user can pause or leave.
- Blocking immediately disables relationship mode.
- Reporting creates a safety event and hides shared recommendations.
- Private check-ins remain private unless the user chooses to share.
- Guidance must never pressure a partner to override boundaries.
- Friction signals must be descriptive and non-diagnostic.

## Guardrails

Moderation and rate limits apply to:

- Relationship profile notes
- Partner preferences
- Plans
- Check-ins
- Freeform repair requests
- Safety reports

The agent must refuse to generate:

- Threats
- Coercive messaging
- Stalking behavior
- Deception
- Instructions to bypass consent
- Therapy or diagnosis claims

## Build Sequence

### Section 1 - Relationship Data Foundation

- Add relationship tables.
- Add relationship types.
- Add store helpers.
- Add eligibility checks from match lifecycle, safety, and mutual interest.
- Add relationship analytics events.

Acceptance:

- Relationship invitation can be created from an eligible match.
- Ineligible matches return clear API errors.
- Blocking prevents relationship creation.

### Section 2 - Consent And Membership

- Add membership records.
- Add invite response endpoint.
- Support accept, decline, pause, resume, and leave.
- Reflect active/paused state in API responses.

Acceptance:

- Relationship mode activates only after both partners accept.
- Either partner can pause or leave.
- Safety actions disable relationship mode.

### Section 3 - Relationship Dashboard

- Add `/relationship`.
- Show active state, partner status, next plan, check-in prompt, guidance preview, and timeline preview.
- Add eligible upgrade entry from match detail.

Acceptance:

- A user can move from a match to a relationship dashboard.
- Empty, pending, active, paused, and safety states are clear.

### Section 4 - Partner Preferences

- Add preference editing.
- Add sharing settings.
- Use existing persona fields to prefill suggestions.
- Add preference analytics.

Acceptance:

- Both partners can maintain visible preference cards.
- Private fields are not shown to the other partner.

### Section 5 - Shared Planner

- Add plan data model and APIs.
- Reuse logistics providers for suggestions.
- Add accept, decline, reschedule, complete.
- Add `/relationship/planner`.

Acceptance:

- Partners can create and respond to shared plans.
- Completed plans appear in the timeline.

### Section 6 - Check-Ins And Guidance

- Add check-in API and UI.
- Add trend aggregation.
- Add communication guidance generator.
- Add privacy controls per check-in.

Acceptance:

- Users can submit private or shared check-ins.
- Shared trends appear only when allowed.
- Guidance uses explicit preferences and recent relationship context.

### Section 7 - Friction Signals And Insights

- Add non-diagnostic friction detection.
- Add repair suggestions.
- Add relationship insights endpoint.
- Add metrics to `/insights`.

Acceptance:

- Signals are explainable and restrained.
- The app recommends small next actions.
- Insights update after plans and check-ins.

### Section 8 - Documentation And Hardening

- Update README.
- Add seed/demo path.
- Run lint, build, and audit.
- Review safety copy.

Acceptance:

- Phase 2 demo flow is documented.
- Production build passes.
- Working tree is clean and pushed.

## Phase 2 Definition Of Done

Phase 2 is complete when:

- An eligible Phase 1 match can become a mutually accepted relationship workspace.
- Both partners have independent control over membership and sharing.
- The relationship dashboard, settings, planner, and check-in flows work locally.
- Plans and check-ins generate timeline and insight updates.
- Safety actions disable relationship mode where appropriate.
- Analytics capture conversion, engagement, and safety events.
- Lint, build, and dependency audit pass.
- README documents the Phase 2 demo path.

