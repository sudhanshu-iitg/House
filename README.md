# Rounds

One app for a whole game night. v1 ships one game, **Password**: two teams of two, played on the host's phone.
The clue-giver gets the secret word on WhatsApp from an Agent 37 agent. Rules and scoring live only in the app.

See [`docs/PLAN.md`](docs/PLAN.md) for the product plan and the decisions behind it.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # game engine tests
npm run typecheck
```

The game works without any setup. With no WhatsApp relay configured, each word shows on the host phone
behind a tap-to-reveal screen, and the timer is held until the clue-giver hides it.

## Environment

| Variable | Where | What |
|---|---|---|
| `AGENT37_WEBHOOK_URL` | server | The Agent 37 agent's inbound webhook. Leave unset to play without WhatsApp |
| `AGENT37_WEBHOOK_SECRET` | server | Sent as `Authorization: Bearer <secret>` |
| `NEXT_PUBLIC_GAME_WA_NUMBER` | build | The agent's WhatsApp number with country code, e.g. `919800000000`. Used for the "say hi" QR code and link |

## What the agent receives

`POST /api/notify` renders one of four fixed templates on the server (word, skip, score, winner), so the relay
can't be used to send arbitrary text. It then makes one request per recipient:

```http
POST $AGENT37_WEBHOOK_URL
Authorization: Bearer $AGENT37_WEBHOOK_SECRET
Idempotency-Key: <matchId>:<turn>:<kind>:<phone>
Content-Type: application/json

{"to": "919812345670", "text": "🔒 Turn 5 · Your word: *MANGO*\nOne-word clues only. Don't show anyone.", "idempotency_key": "..."}
```

The agent's skill should send `text` to `to` on WhatsApp exactly as given, skip a key it has already seen,
and return any 2xx. Players must have messaged the game number once ("hi") so the 24-hour window is open.

## Layout

```
app/                 routes: / (home), /password (setup → say hi → play), /night (tonight's board)
app/api/notify/      Agent 37 relay
components/password/ Setup, Optin, Play screens and the useGame hook
lib/engine/          pure game rules (reducer) + tests
lib/words/           word packs
lib/notify/          message templates and the client
lib/store/           localStorage: current match, remembered players, night tally, local analytics
```
