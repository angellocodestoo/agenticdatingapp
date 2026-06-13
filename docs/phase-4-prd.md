# Red String Phase 4 PRD - Legacy And Decades Layer

## Summary

Phase 4 turns Red String into the lifetime layer: a durable archive and guidance system that stays with a couple through anniversaries, family changes, moves, caregiving, aging, loss, renewal, and long-term legacy.

Phase 1 finds the thread.
Phase 2 learns the rhythm.
Phase 3 ties the knot.
Phase 4 keeps the thread resilient across decades.

## Goals

1. Preserve a couple's long-term story as structured, searchable partnership memory.
2. Support anniversaries, renewal rituals, and major life transitions.
3. Help couples revisit old decisions, goals, repairs, and gratitude.
4. Create long-arc insights without surveillance or diagnosis.
5. Prepare for future family, caregiving, and legacy modes.

## Non-Goals

- No medical, legal, estate, or financial advice.
- No predictions about relationship survival.
- No passive monitoring of children, relatives, or elders.
- No automated legal documents.

## Core Capabilities

### Legacy Dashboard

New route: `/legacy`

Modules:

- Relationship timeline
- Anniversaries
- Renewal rituals
- Life chapters
- Legacy notes
- Decade-level insights

### Life Chapters

Examples:

- Dating era
- Engagement
- Wedding
- First home
- Kids
- Career pivot
- Move
- Caregiving season
- Empty nest
- Retirement

### Anniversaries And Renewal

- Create anniversary
- Create renewal ritual
- Reflect on the year
- Capture vows, commitments, or intentions
- Preserve annual highlights

### Legacy Memory

Legacy memory promotes important household memory into long-term archive:

- Milestones
- Decisions
- Repairs
- Gratitude
- Photos or artifacts later
- Annual letters later

### Decade Insights

Non-diagnostic patterns:

- Most protected rituals
- Goals completed
- Decisions resolved
- Seasons of high load
- Recurring gratitude themes
- Renewal prompts

## Data Model

### `legacy_chapters`

- `id`
- `household_id`
- `created_by_user_id`
- `type`
- `status`
- `started_at`
- `ended_at`
- `created_at`
- `updated_at`
- `json`

### `legacy_anniversaries`

- `id`
- `household_id`
- `created_by_user_id`
- `kind`
- `date`
- `created_at`
- `updated_at`
- `json`

## Build Sequence

### Section 1 - Legacy Foundation

- Add legacy chapter and anniversary tables.
- Add types and store helpers.
- Add list/create APIs.
- Add `/legacy` dashboard.

### Section 2 - Renewal Rituals

- Add renewal prompts.
- Add annual reflection flow.
- Promote household memory into legacy memory.

### Section 3 - Decade Insights

- Add long-arc counts and signals.
- Extend `/insights`.

## Definition Of Done

- Household spaces can create legacy chapters and anniversaries.
- `/legacy` dashboard works locally.
- Legacy data appears in insights.
- Lint, build, and audit pass.

