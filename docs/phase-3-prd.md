# Red String Phase 3 PRD - Marriage And Household Operating System

## Summary

Phase 3 turns Red String from an early-relationship copilot into the partnership operating system for couples building a shared life. Once a relationship is stable, both partners can graduate into marriage or household mode: a long-term workspace for rituals, responsibilities, goals, decisions, family logistics, resilience, and partnership memory.

Phase 1 answered: "Who should I meet?"

Phase 2 answered: "How do we keep building after the first date?"

Phase 3 answers: "How do we run a life together for decades without losing the relationship inside the logistics?"

## Product Positioning

Red String should feel like the calm connective tissue of a partnership. It is not a productivity app with romance sprinkled on top. It is not therapy. It is not surveillance. It is the trusted shared layer that helps two people coordinate a household, protect intimacy, remember what matters, and notice strain before it hardens into resentment.

The product metaphor shifts from the search to the knot:

- Phase 1: the thread shortens the distance.
- Phase 2: the thread helps two people learn each other's rhythm.
- Phase 3: the thread becomes the knot: shared, deliberate, resilient, and tended over time.

## Phase 3 Goals

1. Graduate active relationship spaces into household or marriage mode.
2. Give both partners equal consent and control over the shared life workspace.
3. Organize recurring rituals, responsibilities, decisions, and long-term goals.
4. Protect emotional connection while coordinating practical logistics.
5. Surface non-diagnostic strain patterns from explicit inputs and shared activity.
6. Create a partnership memory that survives busy seasons, moves, kids, careers, and aging.
7. Preserve safety, privacy, and autonomy throughout the shared household layer.

## Non-Goals

- No legal advice, financial advice, medical advice, or therapy claims.
- No unilateral household monitoring.
- No passive reading of private email, messages, call logs, or bank accounts.
- No coercive nudges, partner scoring, or blame assignment.
- No child monitoring or care recommendations beyond simple shared logistics.
- No automated commitments that spend money or create legal obligations.

## Target User Journey

### 1. Relationship Graduates

A couple with an active relationship space chooses to open household mode. Red String requires both partners to accept the upgrade and shows what changes: more durable shared memory, shared responsibilities, goals, decisions, and rituals.

### 2. Household Setup

Partners define:

- Household stage
- Shared address or city
- Rituals they want to protect
- Responsibility areas
- Planning cadence
- Long-term goals
- Sensitive areas requiring extra care

### 3. Operating Dashboard

The dashboard becomes the couple's shared life command center:

- Today's shared rhythm
- Upcoming responsibilities
- Open decisions
- Goals in motion
- Ritual health
- Resilience signals
- Partnership memory

### 4. Weekly Review

Red String prompts a lightweight weekly review:

- What worked?
- What felt heavy?
- What needs a handoff?
- What should be protected next week?
- What decision needs clarity?

### 5. Long-Term Memory

The system preserves shared milestones, decisions, rituals, conflict repairs, goals, and gratitude moments as durable partnership memory.

## Core Capabilities

### Household Mode Upgrade

A relationship can upgrade to household mode when:

- The relationship exists and is active.
- Both members are accepted.
- No member has safety-disabled the relationship.
- Both partners explicitly consent.

The household starts as pending until both partners accept.

### Household Membership

Each partner has a household membership state:

- `invited`
- `accepted`
- `paused`
- `left`
- `removed_for_safety`

Household mode is active only when both partners are accepted. Pause and leave states stop household recommendations.

### Household Profile

Shared household metadata:

- Household stage
- Commitment stage
- Home base
- Planning cadence
- Protected rituals
- Responsibility areas
- Sensitive domains
- Long-term goals
- Legacy notes

### Responsibilities

Responsibilities are recurring or one-time shared obligations:

- Owner
- Backup owner
- Cadence
- Due date
- Status
- Emotional load estimate
- Handoff notes

Examples:

- Grocery reset
- Rent or mortgage reminder
- Family visit planning
- Pet care
- Travel prep
- Holiday planning
- Home maintenance

### Rituals

Rituals are relationship-protective practices:

- Weekly date night
- Sunday reset
- Morning coffee
- Annual trip planning
- Anniversary reflection
- Family dinner

Rituals should be treated differently from tasks. They protect connection, not just completion.

### Decisions

Shared decisions need structured clarity:

- Decision title
- Domain
- Options
- Pros and concerns
- Owner for research
- Decision deadline
- Status
- Outcome

Examples:

- Where to live
- Whether to move
- Wedding scope
- Family planning timing
- Career tradeoffs
- Major purchase

### Goals

Goals capture longer arcs:

- Goal title
- Category
- Target date
- Status
- Milestones
- Partner notes
- Last review

Examples:

- Save for a home
- Plan wedding
- Build a travel tradition
- Prepare for a move
- Strengthen family ties

### Weekly Review

Weekly review captures explicit input:

- Relationship energy
- Logistics load
- Fairness sense
- Connection sense
- Appreciation
- Friction point
- Next week's priority

### Partnership Memory

Memory entries preserve:

- Milestones
- Decisions
- Repairs
- Gratitude
- Rituals completed
- Goals achieved
- Important context

Private notes must remain private. Shared memory entries require explicit sharing.

### Resilience Signals

Signals remain non-diagnostic and repair-oriented:

- Load imbalance trend
- Missed ritual trend
- Decision stuck trend
- High logistics load
- Low connection trend
- Too many open responsibilities

Signals recommend small next actions and never assign blame.

## Required Screens

### Household Dashboard

New route: `/household`

Modules:

- Household status
- This week's rhythm
- Open responsibilities
- Protected rituals
- Open decisions
- Goals in motion
- Resilience signals
- Memory preview

### Household Settings

New route: `/household/settings`

Controls:

- Household profile
- Commitment stage
- Planning cadence
- Protected rituals
- Sensitive domains
- Pause household mode
- Leave household mode
- Safety actions

### Responsibilities

New route: `/household/responsibilities`

Capabilities:

- Create responsibility
- Assign owner and backup
- Mark complete
- Reassign
- Pause
- Add handoff notes

### Decisions

New route: `/household/decisions`

Capabilities:

- Create decision
- Add options
- Add pros and concerns
- Set deadline
- Record outcome
- Archive decision

### Goals

New route: `/household/goals`

Capabilities:

- Create goal
- Add milestones
- Mark milestone complete
- Review goal
- Complete goal

### Weekly Review

New route: `/household/review`

Capabilities:

- Submit review
- Choose sharing level
- Record appreciation and friction
- See resilience guidance

### Memory

New route: `/household/memory`

Capabilities:

- Add shared memory
- Add private memory
- Filter by type
- Promote plan/decision/review moments into memory

## API Requirements

### `POST /api/households`

Creates a household invitation from an eligible relationship.

### `GET /api/households`

Returns the current user's household spaces.

### `PATCH /api/households/[id]`

Updates household profile fields.

### `POST /api/households/[id]/members/respond`

Accepts, declines, pauses, resumes, or leaves household mode.

### `/api/households/[id]/responsibilities`

List and create responsibilities.

### `/api/households/[id]/responsibilities/[responsibilityId]`

Update owner, status, due date, and handoff notes.

### `/api/households/[id]/decisions`

List and create shared decisions.

### `/api/households/[id]/decisions/[decisionId]`

Update options, status, deadline, and outcome.

### `/api/households/[id]/goals`

List and create goals.

### `/api/households/[id]/goals/[goalId]`

Update milestones and status.

### `/api/households/[id]/reviews`

List and create weekly reviews.

### `/api/households/[id]/memory`

List and create memory entries.

### `/api/households/[id]/insights`

Returns household metrics, resilience signals, and guidance.

## Data Model

### `households`

- `id`
- `source_relationship_id`
- `created_by_user_id`
- `stage`
- `status`
- `created_at`
- `updated_at`
- `json`

### `household_members`

- `id`
- `household_id`
- `user_id`
- `status`
- `sharing_level`
- `created_at`
- `updated_at`
- `json`

### `household_responsibilities`

- `id`
- `household_id`
- `owner_user_id`
- `backup_user_id`
- `type`
- `status`
- `due_at`
- `created_at`
- `updated_at`
- `json`

### `household_rituals`

- `id`
- `household_id`
- `created_by_user_id`
- `status`
- `cadence`
- `next_at`
- `created_at`
- `updated_at`
- `json`

### `household_decisions`

- `id`
- `household_id`
- `created_by_user_id`
- `domain`
- `status`
- `deadline_at`
- `created_at`
- `updated_at`
- `json`

### `household_goals`

- `id`
- `household_id`
- `created_by_user_id`
- `category`
- `status`
- `target_at`
- `created_at`
- `updated_at`
- `json`

### `household_reviews`

- `id`
- `household_id`
- `user_id`
- `sharing_level`
- `created_at`
- `json`

### `household_memory`

- `id`
- `household_id`
- `user_id`
- `type`
- `sharing_level`
- `created_at`
- `json`

## Analytics

Track:

- Household invitation created
- Household invitation accepted
- Household paused
- Household resumed
- Household left
- Household safety disabled
- Household profile updated
- Responsibility created
- Responsibility completed
- Ritual created
- Ritual completed
- Decision created
- Decision resolved
- Goal created
- Goal completed
- Weekly review submitted
- Memory created
- Resilience signal surfaced
- Household guidance viewed

Success metrics:

- Relationship-to-household conversion
- Household invitation acceptance
- Weekly active households
- Responsibility completion
- Ritual completion
- Decision resolution
- Weekly review participation
- Memory creation
- User-reported usefulness
- Safety incident rate

## Trust And Safety

- Household mode requires both partners to opt in.
- Either partner can pause or leave.
- Blocking disables household mode.
- Reports hide recommendations and preserve safety history.
- Private reviews and memory entries stay private.
- No blame language.
- No legal, financial, medical, or therapy advice.
- No automated spending or binding commitments.

## Build Sequence

### Section 1 - Household Data Foundation

- Add household tables.
- Add household types.
- Add store helpers.
- Add eligibility checks from active relationship state.
- Add household invitation create/list API.

Acceptance:

- Eligible active relationships can create household invitations.
- Ineligible relationships return clear errors.
- Safety-disabled relationships cannot upgrade.

### Section 2 - Household Consent And Membership

- Add membership response endpoint.
- Support accept, decline, pause, resume, leave.
- Disable household mode on safety actions.

Acceptance:

- Household activates only after both partners accept.
- Either partner can pause or leave.
- Safety actions disable household mode.

### Section 3 - Household Dashboard

- Add `/household`.
- Add relationship-to-household upgrade entry.
- Show pending, active, paused, ended, and safety states.

Acceptance:

- Users can move from relationship mode to household mode.
- Household dashboard shows current state and next actions.

### Section 4 - Household Settings And Profile

- Add `/household/settings`.
- Add profile update API.
- Edit stage, planning cadence, rituals, sensitive domains, responsibility areas, and long-term goals.

Acceptance:

- Both partners can update shared household profile.
- Private controls remain member-owned.

### Section 5 - Responsibilities And Rituals

- Add responsibility model/API/UI.
- Add ritual model/API/UI.
- Support complete, reassign, pause, and handoff notes.

Acceptance:

- Couples can create and complete household responsibilities.
- Rituals are tracked separately from tasks.

### Section 6 - Decisions And Goals

- Add decision model/API/UI.
- Add goal model/API/UI.
- Support outcomes, milestones, and completion.

Acceptance:

- Couples can structure open decisions and long-term goals.
- Completed decisions and goals can create memory entries.

### Section 7 - Weekly Reviews And Memory

- Add review model/API/UI.
- Add memory model/API/UI.
- Support private/shared visibility.

Acceptance:

- Partners can submit reviews and create shared/private memory.
- Memory preserves milestones, gratitude, repairs, decisions, and goals.

### Section 8 - Resilience Insights And Final Hardening

- Add resilience signals.
- Extend `/insights` with Phase 3 metrics.
- Update README demo path.
- Run lint, build, and audit.

Acceptance:

- Household signals are non-diagnostic and repair-oriented.
- Phase 3 demo flow is documented.
- Build, lint, and audit pass.
- Working tree is clean and pushed.

## Phase 3 Definition Of Done

Phase 3 is complete when:

- An active relationship can become a mutually accepted household workspace.
- Both partners have independent household membership control.
- Household dashboard, settings, responsibilities, rituals, decisions, goals, reviews, and memory flows work locally.
- Household insights surface non-diagnostic resilience signals and small repair actions.
- Safety actions disable household mode where appropriate.
- Analytics capture household conversion, engagement, and safety events.
- README documents the Phase 3 demo path.
- Lint, production build, and dependency audit pass.
- GitHub `main` contains the full Phase 3 build and the working tree is clean.

