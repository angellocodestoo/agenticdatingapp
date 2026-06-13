# Red String - Agentic Dating App

Red String is a Phase 1 agentic dating product for people who want fewer, better first dates. A user's AI agent builds a relationship persona, screens candidates, talks to other agents, explains compatibility, handles date logistics, and learns from post-date feedback.

## What It Does

1. Builds a relationship persona from basics, connected sources, notes, AI memory imports, and photos.
2. Publishes discoverable user personas into a persistent candidate marketplace.
3. Ranks candidates by values, interests, life-stage fit, schedule style, freshness, and safety filters.
4. Streams an agent run: dealbreaker screening, compatibility scoring, and agent-to-agent conversation.
5. Enforces a match threshold before a date can be proposed.
6. Requires mutual interest for real user-owned candidates.
7. Proposes a venue, time, and warm-up call through a logistics provider layer.
8. Collects post-date feedback and shows prediction accuracy over time.
9. Supports reporting, blocking, rate limits, moderation checks, analytics, and local persistence.

## Quick Start

```bash
git clone https://github.com/angellocodestoo/agenticdatingapp.git
cd agenticdatingapp
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Path

| Step | Route | What to do |
|------|-------|------------|
| 1 | `/onboarding` | Add basics, connect sources, add context, and build a persona |
| 2 | `/persona` | Review assumptions, values, and dealbreakers |
| 3 | `/settings` | Choose threshold, radius, pool size, and discoverability |
| 4 | `/agent-run` | Send the agent out and review qualified matches |
| 5 | `/history` | Confirm proposals, answer mutual-interest requests, and submit feedback |
| 6 | `/insights` | Review confidence, funnel analytics, learning, and prediction accuracy |

## Phase 1 Capabilities

### Dating Agent

- Persona builder
- Agent settings
- Discoverability controls
- Persistent candidate marketplace
- Candidate ranking
- Block/report filtering
- Agent-to-agent screening
- Match threshold enforcement
- Mutual-interest lifecycle
- Date proposal flow
- Warm-up call scheduling
- Feedback-based learning

### Trust And Safety

- Report and block actions
- Blocked candidates removed from future runs
- Basic text moderation for notes, imports, reports, and feedback
- Rate limits on sensitive write routes
- Upload MIME, size, signature, and dimension validation
- Server-side safety event storage

### Analytics

- Server-side funnel event tracking
- Signup, profile, persona, agent run, match, mutual interest, date, feedback, and safety events
- Insights dashboard summary
- Match prediction accuracy based on real date feedback

### Provider Architecture

The app currently uses local mock providers, but date logistics are isolated behind provider interfaces:

- Availability provider
- Venue provider
- Masked call provider

This makes production swaps for calendar availability, places, and phone masking straightforward.

## Architecture

```mermaid
flowchart LR
  UI[Next.js App Router] --> API[API Routes]
  API --> Store[SQLite Store]
  API --> Agent[Agent Engine]
  API --> Market[Candidate Marketplace]
  API --> Safety[Safety + Guardrails]
  API --> Analytics[Analytics Events]
  API --> Logistics[Logistics Providers]
  Agent --> Scripted[Scripted Engine]
  Agent -. optional .-> LLM[Anthropic LLM Engine]
  Logistics --> Mock[Mock Providers]
```

## Key Files

| Area | Files |
|------|-------|
| Auth and sessions | `src/lib/auth.ts`, `src/app/api/auth/route.ts` |
| Persistence | `src/lib/db.ts`, `src/lib/store.ts` |
| Marketplace | `src/lib/marketplace.ts`, `src/app/api/candidates/route.ts` |
| Agent run | `src/app/api/agent-run/route.ts`, `src/app/agent-run/page.tsx` |
| Mutual interest | `src/app/api/mutual-interest/route.ts`, `src/app/history/page.tsx` |
| Safety | `src/app/api/safety/route.ts`, `src/lib/guardrails.ts` |
| Logistics | `src/lib/logisticsProviders.ts` |
| Insights | `src/app/api/insights/route.ts`, `src/app/insights/page.tsx` |

## Configuration

Create `.env.local` if using optional integrations:

```env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/connect/spotify/callback
```

Without these variables, Red String still runs locally with scripted agents and mock providers.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm audit --audit-level=moderate
```

## Production Notes

Phase 1 now has the product backbone for real agentic dating. Remaining production swaps are mostly provider and operations work:

- Replace mock availability with calendar provider.
- Replace mock venue recommendations with a places provider.
- Replace mock masked numbers with a phone provider.
- Move from local SQLite to managed persistent storage for multi-instance deployment.
- Add admin review tooling for reports and moderation queues.

## Phase 2

Phase 2 expands Red String into an early-relationship copilot for mutually opted-in matches. See [docs/phase-2-prd.md](docs/phase-2-prd.md) for the build plan.
