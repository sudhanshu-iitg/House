"use client";

import { useState } from "react";
import type { Level, Match, Settings } from "@/lib/engine";
import { isValidPhone, normalizePhone } from "@/lib/notify/templates";
import { LEVELS, PACKS } from "@/lib/words";
import { Avatar, TopBar } from "@/components/ui";

/** Between turns: change the word pack, the level, or a player's WhatsApp number. The score stays. */
export function EditMatch({
  match,
  onCancel,
  onSave,
}: {
  match: Match;
  onCancel: () => void;
  onSave: (settings: Partial<Pick<Settings, "packId" | "level">>, phones: Record<string, string>) => void;
}) {
  const [packId, setPackId] = useState(match.settings.packId);
  const [level, setLevel] = useState<Level>(match.settings.level ?? "mixed");
  const [phones, setPhones] = useState<Record<string, string>>(() => Object.fromEntries(match.players.map((p) => [p.id, p.phone])));

  const normalized = Object.fromEntries(Object.entries(phones).map(([id, v]) => [id, v.trim() ? normalizePhone(v) : ""]));
  const bad = match.players.filter((p) => normalized[p.id] && !isValidPhone(normalized[p.id]));
  const changed = Object.fromEntries(match.players.filter((p) => normalized[p.id] !== p.phone).map((p) => [p.id, normalized[p.id]]));

  return (
    <main className="screen">
      <TopBar back={onCancel} label="Change settings" />
      <h1 className="h1 mt-20">Mix it up</h1>
      <p className="small muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
        Changes start from the next turn. The score stays as it is.
      </p>

      <span className="eyebrow mt-20">Word pack</span>
      <div className="row wrap mt-8" style={{ gap: 8 }}>
        {PACKS.map((p) => (
          <button key={p.id} type="button" className="chip" aria-pressed={packId === p.id} onClick={() => setPackId(p.id)}>
            {p.name}
          </button>
        ))}
      </div>

      <span className="eyebrow mt-20">Difficulty</span>
      <div className="row wrap mt-8" style={{ gap: 8 }}>
        {LEVELS.map((l) => (
          <button key={l.id} type="button" className="chip" aria-pressed={level === l.id} onClick={() => setLevel(l.id)}>
            {l.name}
          </button>
        ))}
      </div>

      <span className="eyebrow mt-20">WhatsApp numbers</span>
      <div className="card stack mt-8" style={{ borderRadius: 22, padding: "14px 16px" }}>
        {match.players.map((p, i) => (
          <div key={p.id} className="row">
            <Avatar name={p.name} index={i} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{p.name}</span>
            <label style={{ flex: 1.4, minWidth: 0 }}>
              <span className="sr-only">{p.name}&apos;s WhatsApp number</span>
              <input
                className="field tabular"
                placeholder="WhatsApp no."
                inputMode="tel"
                autoComplete="off"
                value={phones[p.id]}
                maxLength={18}
                onChange={(e) => setPhones({ ...phones, [p.id]: e.target.value })}
              />
            </label>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ fontSize: 13 }}>
        Anyone with a new number gets a welcome message. Leave it blank to show their words on this phone.
      </p>

      <div className="push">
        {bad.length > 0 && <p className="small muted center">Check {bad.map((p) => p.name).join(" and ")}&apos;s number</p>}
        <button type="button" className="btn primary" disabled={bad.length > 0} onClick={() => onSave({ packId, level }, changed)}>
          Save
        </button>
      </div>
    </main>
  );
}
