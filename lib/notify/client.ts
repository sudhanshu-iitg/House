import type { NotifyMessage } from "./templates";

export interface SendRequest {
  /** Idempotency key prefix, e.g. "<matchId>:5:word". */
  key: string;
  messages: NotifyMessage[];
}

export type SendResult = { ok: true } | { ok: false; reason: "not_configured" | "failed" | "timeout" };

/** Set once the server says WhatsApp isn't set up, so we stop calling it. */
let relayOff = false;

export async function sendMessages(req: SendRequest, timeoutMs = 10_000): Promise<SendResult> {
  if (req.messages.length === 0) return { ok: true };
  if (relayOff) return { ok: false, reason: "not_configured" };
  try {
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 503) {
      relayOff = true;
      return { ok: false, reason: "not_configured" };
    }
    const body = (await res.json().catch(() => null)) as { results?: { ok: boolean }[] } | null;
    const allOk = res.ok && !!body?.results?.every((r) => r.ok);
    return allOk ? { ok: true } : { ok: false, reason: "failed" };
  } catch (err) {
    return { ok: false, reason: err instanceof DOMException && err.name === "TimeoutError" ? "timeout" : "failed" };
  }
}

export async function relayConfigured(): Promise<boolean> {
  try {
    const res = await fetch("/api/notify", { cache: "no-store" });
    const body = (await res.json()) as { configured?: boolean };
    relayOff = !body.configured;
    return !!body.configured;
  } catch {
    return false;
  }
}
