"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Match } from "@/lib/engine";
import { loadMatch, loadNight, tallyNight, type Night } from "@/lib/store";
import { Icon, TeamScores } from "@/components/ui";

export default function Home() {
  const [night, setNight] = useState<Night | null>(null);
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    setNight(loadNight());
    const m = loadMatch();
    setMatch(m && m.phase !== "over" ? m : null);
  }, []);

  const tally = night ? tallyNight(night) : null;

  return (
    <main className="screen">
      <div className="row between" style={{ paddingTop: 16 }}>
        <span className="brand">Rounds</span>
        <Link href="/night" className="icon-btn" aria-label="Tonight's board">
          <Icon name="trophy" size={20} color="var(--lime)" />
        </Link>
      </div>

      <div className="stack mt-24" style={{ gap: 6 }}>
        <span className="eyebrow lime">{new Date().toLocaleDateString("en-IN", { weekday: "long" })} night</span>
        <h1 className="h1" style={{ fontSize: 40 }}>
          Game night
        </h1>
      </div>

      {tally && tally.latest.length > 0 ? (
        <Link href="/night" className="card mt-24 stack" style={{ gap: 14 }}>
          <div className="row between small muted">
            <span>Tonight&apos;s tally</span>
            <span>
              {night!.matches.length} {night!.matches.length === 1 ? "match" : "matches"}
            </span>
          </div>
          <TeamScores items={tally.latest.map((w) => ({ name: w.team, value: w.wins }))} />
        </Link>
      ) : (
        <div className="card mt-24 small muted">No matches yet tonight. The first winner gets bragging rights.</div>
      )}

      <h2 className="h2 mt-24" style={{ fontSize: 20 }}>
        {match ? "In progress" : "Play next"}
      </h2>

      <Link
        href="/password"
        className="mt-12"
        style={{
          height: 200,
          borderRadius: 24,
          background: "var(--lime)",
          color: "var(--dark)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <Icon name="lock" size={36} />
          {match && (
            <span className="small" style={{ fontWeight: 700, border: "1.5px solid var(--dark)", borderRadius: 12, padding: "4px 8px" }}>
              {match.scores.join(" – ")}
            </span>
          )}
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <span className="display" style={{ fontSize: 32 }}>
            Password
          </span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>2–6 teams of 2 · 15 min · words on WhatsApp</span>
        </div>
      </Link>

      <div className="mt-12" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        {["Mafia", "Charades"].map((g) => (
          <div key={g} className="card dashed stack" style={{ borderRadius: 20, padding: "14px 16px", gap: 8 }}>
            <span className="h2" style={{ fontSize: 17 }}>
              {g}
            </span>
            <span className="small muted">Coming soon</span>
          </div>
        ))}
      </div>

      <div className="push">
        <Link href="/password" className="btn cream">
          <Icon name="play" />
          {match ? "Resume Password" : "Start Password"}
        </Link>
        <p className="small muted center" style={{ marginBottom: 0 }}>
          No sign-up. Players only need WhatsApp.
        </p>
      </div>
    </main>
  );
}
