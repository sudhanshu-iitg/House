"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearNight, loadNight, tallyNight, teamSlot, type Night } from "@/lib/store";
import { Avatar, TeamScores, TopBar, teamColor as slotColor } from "@/components/ui";

export default function NightPage() {
  const [night, setNight] = useState<Night | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setNight(loadNight());
    setLoaded(true);
  }, []);

  const tally = night ? tallyNight(night) : null;
  const date = new Date(night?.startedAt ?? Date.now()).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const teamColor = (name: string) => slotColor(night ? teamSlot(night, name) : 0);

  const share = async () => {
    if (!night || !tally) return;
    const lines = [
      `Game night · ${date}`,
      ...tally.wins.map((w) => `${w.team}: ${w.wins} ${w.wins === 1 ? "win" : "wins"}`),
      tally.players[0] ? `MVP: ${tally.players[0].name} (${tally.players[0].points} pts as clue-giver)` : "",
    ].filter(Boolean);
    const text = lines.join("\n");
    try {
      if (navigator.share) await navigator.share({ text });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    } catch {
      // Share sheet closed.
    }
  };

  return (
    <main className="screen">
      <TopBar back="/" label={`Game night · ${date}`} />
      <h1 className="h1 mt-20">Tonight&apos;s board</h1>

      {loaded && !night && (
        <div className="card mt-20 small muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
          No matches yet tonight. Finish a match of Password and it shows up here.
        </div>
      )}

      {tally && night && (
        <>
          <div className="card stack mt-20" style={{ gap: 12 }}>
            <span className="small muted">Matches won</span>
            <TeamScores items={tally.latest.map((w) => ({ name: w.team, value: w.wins }))} size={48} />
          </div>

          <span className="eyebrow mt-24">Matches</span>
          <div className="stack mt-8" style={{ gap: 8 }}>
            {night.matches.map((m, i) => (
              <div key={m.id} className="card tight row" style={{ gap: 12 }}>
                <span className="small muted" style={{ width: 22 }}>
                  {i + 1}
                </span>
                <span className="stack grow" style={{ gap: 0 }}>
                  <span style={{ fontWeight: 600, color: teamColor(m.teams[m.winner]) }}>{m.teams[m.winner]} won</span>
                  {m.suddenDeath && <span className="small muted" style={{ fontSize: 12 }}>Sudden death</span>}
                </span>
                <span className="tabular" style={{ fontWeight: 700 }}>
                  {[...m.scores].sort((a, b) => b - a).join(" – ")}
                </span>
              </div>
            ))}
          </div>

          <span className="eyebrow mt-24">Points as clue-giver</span>
          <div className="mt-8" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {tally.players.map((p, i) => (
              <div key={p.name} className={`card row ${i === 0 ? "ok" : ""}`} style={{ height: 60, borderRadius: 16, padding: "0 12px" }}>
                <Avatar name={p.name} index={i} size={30} />
                <span className="stack grow" style={{ gap: 0, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                  {i === 0 && p.points > 0 && (
                    <span className="lime" style={{ fontSize: 11, fontWeight: 700 }}>
                      MVP
                    </span>
                  )}
                </span>
                <span style={{ fontWeight: 700 }}>{p.points}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="push stack" style={{ gap: 12 }}>
        <div className="row">
          <button type="button" className="btn ghost" onClick={share} disabled={!night}>
            Share recap
          </button>
          <Link href="/password" className="btn primary">
            New match
          </Link>
        </div>
        {night && (
          <button
            type="button"
            className="link-btn"
            style={{ alignSelf: "center", color: "var(--muted)" }}
            onClick={() => {
              if (window.confirm("Start a fresh night? Tonight's board will be cleared.")) {
                clearNight();
                setNight(null);
              }
            }}
          >
            Start a new night
          </button>
        )}
      </div>
    </main>
  );
}
