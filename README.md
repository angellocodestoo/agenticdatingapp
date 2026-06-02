# Soulmate — Agentic Dating App

> Your AI agent learns who you really are, talks to other people's agents, and only surfaces dates worth having.

Built for a busy VC fund manager who doesn't have time for dating apps that go nowhere. The core idea: an agent that knows you better than you know yourself filters matches far more effectively than a static profile ever could.

## Demo flow

1. **Connect accounts** — Click to connect Google Calendar, Spotify, and LinkedIn (all mocked). Your agent builds a structured `Persona` with assumptions, values, and lifestyle patterns derived from that data.
2. **Add personal context** — Paste a free-form note ("About me", journal entry, dealbreaker list) so the agent captures what your accounts can't show.
3. **Review & tailor** — See every assumption your agent made with a confidence score. Mark them accurate, partly right, or wrong. Set your core values and hard dealbreakers (these eliminate candidates before any conversation happens).
4. **Agents talk** — Pick from a seeded candidate pool. Your agent and the candidate's agent run a multi-turn conversation that probes values, yellow flags, and lifestyle compatibility. Watch it stream live.
5. **Match report** — Get an overall compatibility score (0–100) broken down by values alignment, lifestyle fit, and logistics. Highlights and risks are surfaced from the conversation.
6. **Concierge proposes a date** — The app cross-references free/busy calendar data, picks a venue based on shared interests, and proposes a specific time and place.
7. **Accept → warm-up call** — On acceptance, a 30-minute masked phone call is scheduled for the night before the date. Both people get a masked number. Your agent will brief you with conversation starters beforehand.

## Architecture

```
src/
├── lib/
│   ├── types.ts              # All domain types (Persona, MatchReport, DateProposal, …)
│   ├── store.ts              # In-memory store (no database needed for demo)
│   ├── agent/
│   │   ├── engine.ts         # AgentEngine interface (pluggable)
│   │   ├── scriptedEngine.ts # Default deterministic brain — zero API keys required
│   │   └── llmEngine.ts      # Stub: swap in with OPENAI_API_KEY or ANTHROPIC_API_KEY
│   └── integrations/
│       └── mock.ts           # Mock OAuth, calendar free/busy, Places, Twilio
├── data/
│   └── candidates.ts         # 5 seeded candidates with full personas + flags
└── app/
    ├── page.tsx               # Landing
    ├── onboarding/page.tsx    # Connect sources + artifact upload
    ├── persona/page.tsx       # Review + tailor agent profile
    ├── matches/
    │   ├── page.tsx           # Candidate pool
    │   └── [id]/page.tsx      # Live agent convo + report + date proposal + call
    └── api/
        ├── profile/route.ts   # Profiler: connect, build, update persona
        ├── candidates/route.ts
        ├── match/route.ts     # Matchmaker: SSE-streamed agent conversation
        └── concierge/route.ts # Date proposal, accept/decline, call scheduling
```

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No `.env` file or API keys needed. Everything runs on the deterministic `ScriptedEngine`.

## Plugging in a real LLM

To upgrade from scripted to a live LLM:

1. Add your key to `.env.local`:
   ```
   OPENAI_API_KEY=sk-…
   # or
   ANTHROPIC_API_KEY=sk-ant-…
   ```
2. Implement `buildPersona` and `converse` in `src/lib/agent/llmEngine.ts` using the `AgentEngine` interface.
3. In `scriptedEngine.ts` (or the API routes), swap `scriptedEngine` for `llmEngine` when the env key is present.

The `AgentEngine` interface is intentionally minimal — both methods are async and return typed domain objects, so dropping in a real LLM is a single-file change.

## Extending to production

| Mock today | Real swap |
|---|---|
| Google Calendar free/busy | Google Calendar API (`/freebusy`) |
| OAuth connect buttons | Google/LinkedIn OAuth 2.0 |
| Spotify data | Spotify Web API |
| Venue picker | Google Places API |
| Masked phone number | Twilio Proxy API |
| In-memory store | Postgres + Prisma |
| ScriptedEngine | LLMEngine (OpenAI / Anthropic) |

Each mock lives in a single file (`src/lib/integrations/mock.ts`) — swap per row above without touching the rest of the app.
