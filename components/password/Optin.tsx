"use client";

import { useEffect, useRef, useState } from "react";
import { isValidPhone, normalizePhone } from "@/lib/notify/templates";
import { relayConfigured, sendMessages } from "@/lib/notify/client";
import { Avatar, Icon, TopBar } from "@/components/ui";
import type { Draft } from "./Setup";

const GAME_NUMBER = (process.env.NEXT_PUBLIC_GAME_WA_NUMBER ?? "").replace(/\D/g, "");

type Status = "sending" | "sent" | "failed";

export function Optin({ draft, onBack, onStart }: { draft: Draft; onBack: () => void; onStart: () => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Record<number, Status>>({});
  const attempts = useRef<Record<number, number>>({});
  const batch = useRef(Math.random().toString(36).slice(2, 10));

  const players = draft.slots.map((s, i) => {
    const phone = normalizePhone(s.phone);
    return { ...s, i, phone, phoneOk: isValidPhone(phone), team: draft.teamNames[Math.floor(i / 2)].trim() };
  });
  const withPhone = players.filter((p) => p.phoneOk);
  const sent = withPhone.filter((p) => status[p.i] === "sent").length;
  const failed = withPhone.filter((p) => status[p.i] === "failed");
  const whatsappOff = configured === false;

  const message = async (p: (typeof players)[number]) => {
    const attempt = (attempts.current[p.i] ?? 0) + 1;
    attempts.current[p.i] = attempt;
    setStatus((s) => ({ ...s, [p.i]: "sending" }));
    const res = await sendMessages({
      key: `welcome:${batch.current}:${p.i}:${attempt}`,
      messages: [{ kind: "welcome", to: p.phone, name: p.name.trim(), team: p.team }],
    });
    if (!res.ok && res.reason === "not_configured") setConfigured(false);
    setStatus((s) => ({ ...s, [p.i]: res.ok ? "sent" : "failed" }));
  };

  useEffect(() => {
    let live = true;
    relayConfigured().then((ok) => {
      if (!live) return;
      setConfigured(ok);
      if (ok) withPhone.forEach(message);
    });
    return () => {
      live = false;
    };
    // Message everyone once, when the screen opens.
  }, []);

  const shareHi = async () => {
    if (!GAME_NUMBER) return;
    const link = `https://wa.me/${GAME_NUMBER}?text=hi`;
    const text = `Game night! Send "hi" to the game so it can text you your words: ${link}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(link);
    } catch {
      // The person closed the share sheet.
    }
  };

  const label = (p: (typeof players)[number]) => {
    if (!p.phoneOk || whatsappOff) return "Word on this phone";
    switch (status[p.i]) {
      case "sent":
        return "Message sent";
      case "failed":
        return "Didn't send · tap to retry";
      default:
        return "Sending…";
    }
  };

  return (
    <main className="screen">
      <TopBar back={onBack} label="Setting up · 2 of 2" />
      <h1 className="h1 mt-20">
        Messaging
        <br />
        everyone
      </h1>
      <p className="small muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
        The game texts each player on WhatsApp so their words can reach them tonight. Nobody needs to send anything.
      </p>

      {whatsappOff && (
        <div className="card alert mt-20 small" style={{ lineHeight: 1.5 }}>
          WhatsApp isn&apos;t connected on this app yet, so words will show on this phone instead. You can still play.
        </div>
      )}

      <span className="eyebrow mt-24">{whatsappOff || configured === null ? "Players" : `Messaged · ${sent} of ${withPhone.length}`}</span>
      <div className="mt-8" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {players.map((p) => {
          const st = !whatsappOff && p.phoneOk ? status[p.i] : undefined;
          return (
            <button
              key={p.i}
              type="button"
              className={`card row ${st === "sent" ? "ok" : st === "failed" ? "alert" : "dashed"}`}
              style={{ height: 64, borderRadius: 18, padding: "0 12px", textAlign: "left" }}
              disabled={st !== "failed"}
              onClick={() => message(p)}
            >
              <Avatar name={p.name} index={p.i} size={32} />
              <span className="stack" style={{ gap: 0, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                <span className="small muted" style={{ fontSize: 12 }}>
                  {label(p)}
                </span>
              </span>
              {st === "sent" && <Icon name="check" size={20} color="var(--lime)" stroke={2.5} />}
            </button>
          );
        })}
      </div>

      {failed.length > 0 && GAME_NUMBER && (
        <div className="card mt-16 small" style={{ lineHeight: 1.5 }}>
          Still not getting through? They can send &quot;hi&quot; to the game instead.{" "}
          <button type="button" className="link-btn" onClick={shareHi}>
            Share the link
          </button>
        </div>
      )}

      <div className="push">
        <button type="button" className="btn primary" onClick={onStart}>
          Start match
        </button>
      </div>
    </main>
  );
}
