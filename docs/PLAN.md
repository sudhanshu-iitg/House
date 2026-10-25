# Party Games Hub: v1 build plan (Password)

Status: draft, 25 Oct 2026. Source: PRD "Party Games Hub — Password (v1)".

## 1. What we're building

A host-only web app (installable PWA) that runs one game, Password, for 2 teams of 2.
Players never install anything: the app tells an Agent 37 agent who should get the secret word,
and the agent sends it to that player on WhatsApp. Scoring and rules live only in the app.

The decisions already made in the PRD:

| Question | Decision |
|---|---|
| Pass-the-phone as a first-class mode? | No. WhatsApp delivery is the main path; tap-to-reveal is only a fallback |
| Who sends WhatsApp messages? | Agent 37, for all WhatsApp messages |
| Scoring over WhatsApp? | No. Scoring happens only in the app |
| Night tally in v1? | Yes |
| First word pack language | English |
| Target score / timer | Configurable. Defaults are 15 points and 30 s |

## 2. Architecture

```
 Host phone (PWA, Next.js)                     Vercel                      Agent 37
 ┌───────────────────────────┐   POST    ┌──────────────────┐  webhook  ┌──────────────────┐  Composio  WhatsApp
 │ Game engine (pure TS)     │──────────▶│ /api/notify      │──────────▶│ "send_message"   │──────────▶ players
 │ UI: setup/turn/score      │◀──────────│ holds secret,    │◀──────────│ skill (template, │
 │ State: localStorage       │  status   │ signs, retries   │  ack      │ no LLM choices)  │
 └───────────────────────────┘           └──────────────────┘           └──────────────────┘
```

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel as a PWA.
  It has no accounts and no database. Match state, remembered players and the night tally live in `localStorage`.
- **Game engine:** a pure, framework-free TypeScript module (`lib/engine`) built as a reducer:
  `(state, action) => state`. It owns every rule: turn order, role swap, clue counter, timer expiry,
  scoring, skips, win and sudden death. It is fully unit-tested and it is the only place that decides anything.
- **Notify API:** a single serverless route, `POST /api/notify`. It keeps the Agent 37 webhook URL and
  secret off the client, adds an idempotency key (`matchId:turnNo:kind:playerId`) and retries once.
  It also limits each match to a sane number of messages.
- **Agent 37 agent:** a single deterministic skill, `send_whatsapp(to, text, idempotency_key)`.
  The app builds the **complete message text**. The agent only delivers it and never chooses words,
  scores or phrasing. This removes LLM latency and LLM mistakes from the critical path.
- **Fallback:** a "Reveal on this phone" button is always available during a turn. It is highlighted
  when `/api/notify` fails or takes more than 5 s. The host hands the phone to the clue-giver, who holds
  to reveal and releases to hide.

### Message templates (owned by the app)

| Kind | To | Text |
|---|---|---|
| `word` | clue-giver | `🔒 Turn 4 · Your word: *MANGO*. One-word clues only. Don't show anyone.` |
| `skip` | clue-giver | `🔁 New word: *TRAIN*` |
| `score` | all 4 | `Team Chai 9 – 7 Team Coffee · Next up: Riya gives clues` |
| `winner` | all 4 | `🏆 Team Chai wins 15–12! Night tally: Chai 2, Coffee 1` |
| `optin_ack` | player | `You're in for game night ✅` (sent by the agent when it receives "hi") |

## 3. Game rules as code (decisions to confirm)

- Turn order is A, B, A, B. Within a team, clue-giver and guesser swap on that team's next turn.
- A turn ends on a correct guess, on the 3rd failed clue, or when the timer hits 0.
  Scoring is 3/2/1/0 based on which clue the guess came on.
- **Skip:** max 1 per turn. It sends a new word, resets the clue counter and keeps the timer running.
  *(Proposed. The PRD doesn't specify whether it resets clues.)*
- **Win check at the end of a round** (after both teams have played), so team A doesn't win just because
  it went first:
  - one team ≥ target: that team wins
  - both teams ≥ target: the higher score wins
  - both teams ≥ target and tied: sudden death, one turn each with the same rules, repeated until someone leads
  *(Proposed interpretation of "ties go to sudden death".)*
- Data model supports 2–6 players per team. The v1 UI locks it to 2 per team.
- House rules: timer length (20/30/45/60 s), target score (10/15/20/custom), word pack.

## 4. Screens

1. **Hub:** Password tile, plus a "Game night" scoreboard entry that shows the tally.
2. **Setup:** 4 players (name + WhatsApp number, remembered across nights), shuffle teams, team names,
   word pack, and a house-rules sheet.
3. **Opt-in checklist:** a QR code / `wa.me/<agent-number>?text=hi` link for the table. Each player shows a
   tick once the agent confirms receiving their "hi" (see open question Q2; the manual fallback is the host ticking it).
4. **Turn ready:** "Riya gives clues → Arjun guesses" and a big **Start turn** button.
5. **Turn live:** a big timer ring, clue dots (3), and three big controls: **Correct**, **Next clue** and
   **Skip** (1 per turn). The WhatsApp delivery state appears as a small chip: sending / sent / failed → Reveal.
6. **Turn result:** the points earned, then the scoreboard. It auto-advances after 3 s.
7. **Winner:** confetti, the final score, **Play again** and **Back to game night**.
8. **Game night:** matches tonight, wins per team/player, MVP (nice-to-have), and a share recap to WhatsApp (nice-to-have).

Visual language: reuse the dark style of the shared design artifact (`#111115` page, mint `#34d399` primary,
indigo `#6d6af5` secondary, Bricolage Grotesque / DM Sans / JetBrains Mono, 42 px+ tap targets).
*The linked artifact shows DesignLingo screens, not Party Games Hub screens (see Q1).*

## 5. Repo layout

```
app/                    Next.js routes: /, /password/setup, /password/play, /night
  api/notify/route.ts   Agent 37 relay
components/             Timer, ClueDots, BigButton, Scoreboard, PlayerRow, RevealCard
lib/engine/             Pure game reducer + types + tests
lib/words/              everyday.json, bollywood.json, food.json, hard.json (~300 each, original)
lib/notify/             client: templates, send(), status tracking
lib/store/              localStorage persistence (versioned), night tally
lib/analytics/          local-only event log
```

## 6. Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | Scaffold: Next.js, TS, Tailwind, Vitest, ESLint, Vercel preview, PWA manifest | Empty hub deploys |
| M1 | Game engine + tests | All rules in §3 covered, including sudden death, skip and timer expiry |
| M2 | Host UI on the engine, **reveal-only** (no WhatsApp yet) | Four people can finish a match on one phone. This is also the fallback path |
| M3 | Agent 37 integration: agent skill, `/api/notify`, delivery chip, fallback trigger | Word reaches the clue-giver in < 3 s p50, and a failure drops to reveal cleanly |
| M4 | Opt-in flow (QR/wa.me), remembered players, house rules, 4 word packs | Open app → first word in < 60 s, measured with a stopwatch |
| M5 | Night tally, winner/score pushes, local analytics events | Tally survives reloads; events logged |
| M6 | Play-tests (10 groups), word-pack pruning by skip rate, per-match cost model | North-star data from real groups |

M2 is deliberately ahead of M3. It proves the core loop and the fallback before we depend on the agent.

## 7. Risks that change the build

- **WhatsApp sending identity.** Agent 37 seems to connect WhatsApp through Composio, possibly via a
  personal account. Unofficial automation of a personal number risks a ban; the Business API needs templates
  outside the 24 h window. Confirm which one Agent 37 uses before M3.
- **Inbound "hi".** To show opt-in ticks, the agent needs to tell the app a player messaged it. That needs
  either an agent → app webhook (which would require a tiny KV store keyed by match code, e.g. Vercel KV/Upstash)
  or the host ticking players manually. Manual ticking is the v1 default.
- **Latency.** Keep the word send off any LLM reasoning path and measure it in M3. The fallback covers the tail.
- **Name/IP.** Ship under an original name (pick one before M4 copy work). Word lists are written by hand.

## 8. Open questions for @sid

1. **Q1:** The linked design (`Czgpbj5dfBr4dYcfMm8u4j`) is the DesignLingo "Day 1 to Day 2" flow.
   Is there a Party Games Hub design, or should we design these screens from scratch in that visual style?
2. **Q2:** What does Agent 37 actually expose? We need an inbound trigger URL, the auth scheme, and whether
   it can call us back for delivery status and received "hi" messages.
3. **Q3:** Confirm the end-of-round win check and that a skip resets the clue counter (§3).
4. **Q4:** Product name.
