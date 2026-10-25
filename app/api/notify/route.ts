import { NextResponse } from "next/server";
import { parseMessage, render, type OutgoingMessage } from "@/lib/notify/templates";

/**
 * Relays game messages to the Agent 37 agent, which delivers them on WhatsApp.
 * The webhook URL and secret stay on the server.
 *
 *   AGENT37_WEBHOOK_URL     the agent's inbound webhook
 *   AGENT37_WEBHOOK_SECRET  sent as a Bearer token
 *
 * Each call POSTs {to, text, idempotency_key} as JSON, one request per recipient.
 */

export const runtime = "nodejs";

const MAX_MESSAGES = 6;
const AGENT_TIMEOUT_MS = 8_000;

function config() {
  const url = process.env.AGENT37_WEBHOOK_URL;
  const secret = process.env.AGENT37_WEBHOOK_SECRET;
  return url ? { url, secret } : null;
}

export function GET() {
  return NextResponse.json({ configured: config() !== null });
}

export async function POST(req: Request) {
  const cfg = config();
  if (!cfg) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { key?: unknown; messages?: unknown } | null;
  const key = typeof body?.key === "string" && /^[\w:.-]{1,100}$/.test(body.key) ? body.key : null;
  if (!key || !Array.isArray(body?.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = body.messages.map(parseMessage);
  if (parsed.some((m) => m === null)) return NextResponse.json({ error: "bad_message" }, { status: 400 });

  const outgoing: OutgoingMessage[] = parsed.map((m) => ({ to: m!.to, text: render(m!), key: `${key}:${m!.to}` }));
  const results = await Promise.all(outgoing.map((m) => deliver(cfg, m)));
  const ok = results.every((r) => r.ok);
  return NextResponse.json({ results }, { status: ok ? 200 : 502 });
}

async function deliver(cfg: { url: string; secret?: string }, m: OutgoingMessage) {
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": m.key,
        ...(cfg.secret ? { authorization: `Bearer ${cfg.secret}` } : {}),
      },
      body: JSON.stringify({ to: m.to, text: m.text, idempotency_key: m.key }),
      signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
    });
    return { to: m.to, ok: res.ok, status: res.status };
  } catch {
    return { to: m.to, ok: false, status: 0 };
  }
}
