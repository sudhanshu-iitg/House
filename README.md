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
| `AGENT37_WEBHOOK_URL` | server | The Hermes webhook route on the Agent 37 instance, e.g. `https://webhooks-<id>.agent37.app/webhooks/rounds`. Leave unset to play without WhatsApp |
| `AGENT37_WEBHOOK_SECRET` | server | The route's HMAC secret, used to sign each request |
| `NEXT_PUBLIC_GAME_WA_NUMBER` | build | The agent's WhatsApp number with country code, e.g. `919800000000`. Used for the fallback "send hi" link if a welcome message doesn't get through |

## What the agent receives

`POST /api/notify` renders one of five fixed templates on the server (welcome, word, skip, score, winner), so the relay
can't be used to send arbitrary text. It then makes one request per recipient:

```http
POST $AGENT37_WEBHOOK_URL
X-Webhook-Timestamp: <unix seconds>
X-Webhook-Signature-V2: <hex HMAC-SHA256 of "<timestamp>.<body>" with $AGENT37_WEBHOOK_SECRET>
X-Request-ID: <matchId>:<turn>:<kind>:<phone>
Content-Type: application/json

{"to": "919812345670", "text": "🔒 Turn 5 · Your word: *MANGO*\nOne-word clues only. Don't show anyone.", "idempotency_key": "..."}
```

On the agent this is a Hermes webhook route with `deliver_only: true`: Hermes checks the signature, drops a
repeated `X-Request-ID`, and sends `text` to `to` on WhatsApp exactly as given, with no LLM in the path. After setup the app sends each player a welcome message, so nobody has to message the game first.

## Layout

```
app/                 routes: / (home), /password (setup → message everyone → play), /night (tonight's board)
app/api/notify/      Agent 37 relay
components/password/ Setup, Optin, Play, EditMatch screens and the useGame hook
lib/engine/          pure game rules (reducer) + tests
lib/words/           word packs
lib/notify/          message templates and the client
lib/store/           localStorage: current match, remembered players, night tally, local analytics
```
