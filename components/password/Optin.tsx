"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { isValidPhone, normalizePhone } from "@/lib/notify/templates";
import { relayConfigured } from "@/lib/notify/client";
import { Avatar, Icon, TopBar } from "@/components/ui";
import type { Draft } from "./Setup";

const GAME_NUMBER = (process.env.NEXT_PUBLIC_GAME_WA_NUMBER ?? "").replace(/\D/g, "");

export function Optin({ draft, onBack, onStart }: { draft: Draft; onBack: () => void; onStart: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const link = GAME_NUMBER ? `https://wa.me/${GAME_NUMBER}?text=hi` : null;

  useEffect(() => {
    relayConfigured().then(setConfigured);
    if (link) {
      QRCode.toString(link, { type: "svg", margin: 1, color: { dark: "#15121C", light: "#F4EFE8" } })
        .then(setQr)
        .catch(() => setQr(null));
    }
  }, [link]);

  const share = async () => {
    if (!link) return;
    const text = `Game night! Send "hi" to the game so it can text you your words: ${link}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(link);
    } catch {
      // The person closed the share sheet.
    }
  };

  const players = draft.slots.map((s, i) => ({ ...s, i, phoneOk: isValidPhone(normalizePhone(s.phone)) }));
  const withPhone = players.filter((p) => p.phoneOk);
  const ready = withPhone.filter((p) => done[p.i]).length;
  const whatsappOff = configured === false || !link;

  return (
    <main className="screen">
      <TopBar back={onBack} label="Setting up · 2 of 2" />
      <h1 className="h1 mt-20">
        Everyone,
        <br />
        send &quot;hi&quot;
      </h1>
      <p className="small muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
        Scan it once. WhatsApp opens with &quot;hi&quot; typed. That lets the game text you your words tonight.
      </p>

      {whatsappOff ? (
        <div className="card alert mt-20 small" style={{ lineHeight: 1.5 }}>
          WhatsApp isn&apos;t connected on this app yet, so words will show on this phone instead. You can still play.
        </div>
      ) : (
        <div className="card row mt-20" style={{ borderRadius: 22, padding: 18, gap: 16 }}>
          <div
            role="img"
            aria-label="QR code that opens WhatsApp chat with the game"
            style={{ width: 112, height: 112, borderRadius: 16, background: "var(--ink)", overflow: "hidden", flex: "none", padding: 6 }}
            dangerouslySetInnerHTML={qr ? { __html: qr } : undefined}
          />
          <div className="stack" style={{ minWidth: 0 }}>
            <span className="small muted">Or share the link</span>
            <span className="small" style={{ fontWeight: 600, wordBreak: "break-all" }}>
              wa.me/{GAME_NUMBER}?text=hi
            </span>
            <button type="button" className="btn sm auto" style={{ background: "var(--card-2)", color: "var(--ink)" }} onClick={share}>
              <Icon name="share" size={16} />
              Share
            </button>
          </div>
        </div>
      )}

      <span className="eyebrow mt-24">
        {whatsappOff ? "Players" : `Said hi · ${ready} of ${withPhone.length}`}
      </span>
      <div className="mt-8" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {players.map((p) => {
          const ok = !whatsappOff && p.phoneOk && done[p.i];
          return (
            <button
              key={p.i}
              type="button"
              className={`card row ${ok ? "ok" : "dashed"}`}
              style={{ height: 64, borderRadius: 18, padding: "0 12px", textAlign: "left" }}
              disabled={whatsappOff || !p.phoneOk}
              aria-pressed={!!ok}
              onClick={() => setDone({ ...done, [p.i]: !done[p.i] })}
            >
              <Avatar name={p.name} index={p.i} size={32} />
              <span className="stack" style={{ gap: 0, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                <span className="small muted" style={{ fontSize: 12 }}>
                  {!p.phoneOk ? "Word on this phone" : whatsappOff ? "Word on this phone" : ok ? "Said hi" : "Tap when they've said hi"}
                </span>
              </span>
              {ok && <Icon name="check" size={20} color="var(--lime)" stroke={2.5} />}
            </button>
          );
        })}
      </div>

      <div className="push">
        <button type="button" className="btn primary" onClick={onStart}>
          Start match
        </button>
      </div>
    </main>
  );
}
