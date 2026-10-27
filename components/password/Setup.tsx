"use client";

import { useState } from "react";
import { MAX_TEAMS, MIN_TEAMS, shuffle, type Settings } from "@/lib/engine";
import { LEVELS, PACKS } from "@/lib/words";
import type { CrewMember } from "@/lib/store";
import { Avatar, Icon, TopBar, teamColor } from "@/components/ui";

export interface Draft {
  /** 2 to 6 teams of 2. */
  teamNames: string[];
  /** Two per team: slots 0–1 are the first team, 2–3 the second, and so on. */
  slots: CrewMember[];
  settings: Settings;
}

const TIMER_OPTIONS = [20, 30, 45, 60];
const TARGET_OPTIONS = [10, 15, 20, 25];
const SKIP_OPTIONS = [0, 1, 2];
const TEAM_COUNTS = Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => MIN_TEAMS + i);
export const DEFAULT_TEAM_NAMES = ["Team Chai", "Team Coffee", "Team Lassi", "Team Nimbu", "Team Thandai", "Team Kulfi"];
const EMPTY_SLOT: CrewMember = { name: "", phone: "" };

/** Resizes a draft to `n` teams, keeping the teams and players already filled in. */
export function withTeamCount(d: Draft, n: number, crew: CrewMember[] = []): Draft {
  const teamNames = Array.from({ length: n }, (_, t) => d.teamNames[t] ?? DEFAULT_TEAM_NAMES[t]);
  const taken = new Set(d.slots.map((s) => s.name.trim().toLowerCase()).filter(Boolean));
  const spare = crew.filter((c) => !taken.has(c.name.trim().toLowerCase()));
  const slots = Array.from({ length: n * 2 }, (_, i) => d.slots[i] ?? spare.shift() ?? EMPTY_SLOT);
  return { ...d, teamNames, slots };
}

export function draftProblem(d: Draft): string | null {
  const names = d.slots.map((s) => s.name.trim());
  if (names.some((n) => !n)) return `Add all ${names.length} names`;
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) return "Names must be different";
  const teams = d.teamNames.map((t) => t.trim().toLowerCase());
  if (teams.some((t) => !t) || new Set(teams).size !== teams.length) {
    return "Give the teams different names";
  }
  return null;
}

export function Setup({
  draft,
  crew,
  onChange,
  onNext,
}: {
  draft: Draft;
  crew: CrewMember[];
  onChange: (d: Draft) => void;
  onNext: () => void;
}) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const problem = draftProblem(draft);
  const s = draft.settings;

  const setSlot = (i: number, patch: Partial<CrewMember>) =>
    onChange({ ...draft, slots: draft.slots.map((slot, k) => (k === i ? { ...slot, ...patch } : slot)) });
  const setSettings = (patch: Partial<Settings>) => onChange({ ...draft, settings: { ...s, ...patch } });
  const setTeamName = (t: number, name: string) => {
    const teamNames = [...draft.teamNames];
    teamNames[t] = name;
    onChange({ ...draft, teamNames });
  };
  const fillFromCrew = () => {
    const recent = crew.slice(0, draft.slots.length);
    onChange({ ...draft, slots: draft.slots.map((slot, i) => recent[i] ?? slot) });
  };

  return (
    <main className="screen">
      <TopBar back="/" label="Setting up · 1 of 2" />
      <h1 className="h1 mt-20">Who&apos;s playing?</h1>
      <p className="small muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
        Names and WhatsApp numbers. We&apos;ll remember them next time.
      </p>

      <span className="eyebrow mt-20">Teams</span>
      <div className="row wrap mt-8" style={{ gap: 8 }}>
        {TEAM_COUNTS.map((n) => (
          <button key={n} type="button" className="chip" aria-pressed={draft.teamNames.length === n} onClick={() => onChange(withTeamCount(draft, n, crew))}>
            {n} teams
          </button>
        ))}
      </div>

      {draft.teamNames.map((_, t) => (
        <div key={t} className="card stack mt-16" style={{ borderRadius: 22, padding: "14px 16px" }}>
          <label className="row" style={{ gap: 8 }}>
            <span className="dot" style={{ background: teamColor(t) }} />
            <span className="sr-only">Team {t + 1} name</span>
            <input
              className="field bare"
              style={{ color: teamColor(t), fontSize: 14 }}
              value={draft.teamNames[t]}
              maxLength={20}
              onChange={(e) => setTeamName(t, e.target.value)}
            />
          </label>
          {[t * 2, t * 2 + 1].map((i) => (
            <div key={i} className="row">
              <Avatar name={draft.slots[i].name || "?"} index={i} />
              <label style={{ flex: 1.1, minWidth: 0 }}>
                <span className="sr-only">Player {i + 1} name</span>
                <input
                  className="field"
                  placeholder="Name"
                  value={draft.slots[i].name}
                  maxLength={20}
                  autoComplete="off"
                  onChange={(e) => setSlot(i, { name: e.target.value })}
                />
              </label>
              <label style={{ flex: 1.4, minWidth: 0 }}>
                <span className="sr-only">Player {i + 1} WhatsApp number</span>
                <input
                  className="field tabular"
                  placeholder="WhatsApp no."
                  inputMode="tel"
                  autoComplete="off"
                  value={draft.slots[i].phone}
                  maxLength={18}
                  onChange={(e) => setSlot(i, { phone: e.target.value })}
                />
              </label>
            </div>
          ))}
        </div>
      ))}

      <div className="row mt-12">
        <button type="button" className="btn ghost sm" onClick={() => onChange({ ...draft, slots: shuffle(draft.slots) })}>
          <Icon name="shuffle" size={16} />
          Shuffle teams
        </button>
        <button type="button" className="btn ghost sm" disabled={crew.length < 1} onClick={fillFromCrew}>
          + Last night&apos;s crew
        </button>
      </div>

      <span className="eyebrow mt-20">Word pack</span>
      <div className="row wrap mt-8" style={{ gap: 8 }}>
        {PACKS.map((p) => (
          <button key={p.id} type="button" className="chip" aria-pressed={s.packId === p.id} onClick={() => setSettings({ packId: p.id })}>
            {p.name}
          </button>
        ))}
      </div>

      <span className="eyebrow mt-20">Difficulty</span>
      <div className="row wrap mt-8" style={{ gap: 8 }}>
        {LEVELS.map((l) => (
          <button key={l.id} type="button" className="chip" aria-pressed={(s.level ?? "mixed") === l.id} onClick={() => setSettings({ level: l.id })}>
            {l.name}
          </button>
        ))}
      </div>

      <div className="card tight mt-16">
        <div className="row between">
          <span style={{ fontSize: 14 }}>
            {s.turnSeconds}s timer · first to {s.targetScore} · {s.skipsPerTurn} skip{s.skipsPerTurn === 1 ? "" : "s"}
          </span>
          <button type="button" className="link-btn" aria-expanded={rulesOpen} onClick={() => setRulesOpen(!rulesOpen)}>
            {rulesOpen ? "Done" : "Edit"}
          </button>
        </div>
        {rulesOpen && (
          <div className="stack mt-12" style={{ gap: 12 }}>
            <OptionRow label="Timer" options={TIMER_OPTIONS} value={s.turnSeconds} format={(v) => `${v}s`} onPick={(v) => setSettings({ turnSeconds: v })} />
            <OptionRow label="Play to" options={TARGET_OPTIONS} value={s.targetScore} format={String} onPick={(v) => setSettings({ targetScore: v })} />
            <OptionRow label="Skips per turn" options={SKIP_OPTIONS} value={s.skipsPerTurn} format={String} onPick={(v) => setSettings({ skipsPerTurn: v })} />
          </div>
        )}
      </div>

      <div className="push">
        {problem && <p className="small muted center">{problem}</p>}
        <button type="button" className="btn primary" disabled={!!problem} onClick={onNext}>
          Next · message everyone
        </button>
      </div>
    </main>
  );
}

function OptionRow({
  label,
  options,
  value,
  format,
  onPick,
}: {
  label: string;
  options: number[];
  value: number;
  format: (v: number) => string;
  onPick: (v: number) => void;
}) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="small muted">{label}</span>
      <div className="row wrap" style={{ gap: 8 }}>
        {options.map((o) => (
          <button key={o} type="button" className="chip" aria-pressed={o === value} onClick={() => onPick(o)}>
            {format(o)}
          </button>
        ))}
      </div>
    </div>
  );
}
