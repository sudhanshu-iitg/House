"use client";

import Link from "next/link";
import { useState } from "react";
import { MAX_CLUES, playerById, pointsForClue, remainingMs, skipsLeft, upNext, type Match } from "@/lib/engine";
import { Avatar, Icon, TEAM_COLORS, TeamLabel } from "@/components/ui";
import { useGame, type Delivery } from "./useGame";

function clock(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function indexOf(m: Match, id: string) {
  return m.players.findIndex((p) => p.id === id);
}

export function Play({ initial, onPlayAgain, onExit }: { initial: Match; onPlayAgain: (m: Match) => void; onExit: () => void }) {
  const g = useGame(initial);
  const m = g.match;

  if (m.phase === "over") return <Winner match={m} onPlayAgain={() => onPlayAgain(m)} onExit={onExit} />;
  if (m.phase === "result") return <TurnResult match={m} relayOn={g.relayOn} onNext={g.proceed} />;
  if (m.phase === "live" && g.revealOpen) return <Reveal match={m} onDone={g.closeReveal} />;
  if (m.phase === "live") return <TurnLive match={m} now={g.now} delivery={g.delivery} game={g} />;
  return <TurnReady match={m} onStart={g.startTurn} onExit={onExit} />;
}

function ScoreStrip({ match }: { match: Match }) {
  return (
    <div className="card tight row mt-16" style={{ borderRadius: 20, padding: "14px 16px", gap: 12 }}>
      <TeamLabel team={0} name={match.teams[0].name} />
      <span className="display tabular" style={{ fontSize: 24 }}>
        {match.scores[0]} – {match.scores[1]}
      </span>
      <TeamLabel team={1} name={match.teams[1].name} align="end" />
      <span className="grow" />
      <span className="small muted">{match.suddenDeath ? "sudden death" : `first to ${match.settings.targetScore}`}</span>
    </div>
  );
}

function TurnReady({ match, onStart, onExit }: { match: Match; onStart: () => void; onExit: () => void }) {
  const next = upNext(match);
  const giver = playerById(match, next.clueGiverId);
  const guesser = playerById(match, next.guesserId);
  const hasPhone = giver.phone.length > 0;
  const no = match.history.length + 1;

  return (
    <main className="screen">
      <div className="row between">
        <span className="eyebrow">Password · turn {no}</span>
        <button
          type="button"
          className="btn ghost sm auto"
          onClick={() => {
            if (window.confirm("End this match? The score won't count tonight.")) onExit();
          }}
        >
          End match
        </button>
      </div>
      <ScoreStrip match={match} />

      <div className="stack mt-32" style={{ gap: 8 }}>
        <TeamLabel team={next.team} name={`${match.teams[next.team].name}'s turn`} />
        <span className="muted" style={{ fontSize: 15 }}>
          Clues from
        </span>
        <span className="display" style={{ fontSize: 56, letterSpacing: "-1.5px" }}>
          {giver.name}
        </span>
        <span className="row small lime" style={{ gap: 8, fontSize: 14 }}>
          <Icon name={hasPhone ? "chat" : "eye"} size={16} />
          {hasPhone ? "Your word arrives on WhatsApp" : "You'll see your word on this phone"}
        </span>
      </div>

      <div className="stack mt-24" style={{ gap: 8 }}>
        <span className="muted" style={{ fontSize: 15 }}>
          Guess by
        </span>
        <span className="display" style={{ fontSize: 56, letterSpacing: "-1.5px" }}>
          {guesser.name}
        </span>
        <span className="small muted" style={{ fontSize: 14 }}>
          One guess per clue. Say it out loud.
        </span>
      </div>

      <div className="card stack mt-24" style={{ borderRadius: 20, padding: 16, gap: 8 }}>
        <span className="eyebrow">House rules</span>
        <span style={{ fontSize: 14, lineHeight: 1.5 }}>
          One-word clues only. No gestures, no rhymes, no part of the word. Up to {MAX_CLUES} clues in {match.settings.turnSeconds}{" "}
          seconds: 3, 2 or 1 points.
        </span>
      </div>

      <div className="push">
        <button type="button" className="btn primary lg" onClick={onStart}>
          <Icon name="play" size={20} />
          Start turn
        </button>
        <p className="small muted center" style={{ marginBottom: 0 }}>
          {hasPhone ? `Sends ${giver.name} the word and starts the timer` : "Starts the turn"}
        </p>
      </div>
    </main>
  );
}

function DeliveryChip({ delivery, name }: { delivery: Delivery; name: string }) {
  const map: Record<Delivery["state"], { text: string; color: string }> = {
    idle: { text: "", color: "var(--muted)" },
    sending: { text: `Sending to ${name}…`, color: "var(--muted)" },
    sent: { text: `Word sent to ${name}`, color: "var(--lime)" },
    failed: { text: "WhatsApp didn't send", color: "var(--coral)" },
    local: { text: "Word on this phone", color: "var(--muted)" },
  };
  let { text, color } = map[delivery.state];
  if (delivery.state === "sending" && delivery.slow) {
    text = "WhatsApp is slow";
    color = "var(--coral)";
  }
  return (
    <span className="row small" role="status" style={{ gap: 6, fontWeight: 600, color: "var(--muted)" }}>
      <span className="dot" style={{ background: color }} />
      {text}
    </span>
  );
}

function TurnLive({
  match,
  now,
  delivery,
  game,
}: {
  match: Match;
  now: number;
  delivery: Delivery;
  game: ReturnType<typeof useGame>;
}) {
  const t = match.turn!;
  const giver = playerById(match, t.clueGiverId);
  const guesser = playerById(match, t.guesserId);
  const left = remainingMs(t, now);
  const paused = t.pausedMs !== null;
  const total = match.settings.turnSeconds * 1000;
  const trouble = delivery.state === "failed" || (delivery.state === "sending" && delivery.slow);
  const skips = skipsLeft(match);
  const pts = pointsForClue(t.clue);

  return (
    <main className="screen">
      <div className="row between">
        <span className="eyebrow">
          Turn {t.no} · {match.teams[t.team].name}
        </span>
        <DeliveryChip delivery={delivery} name={giver.name} />
      </div>

      <div className="row between mt-20" style={{ alignItems: "flex-end" }}>
        <div className="stack" style={{ gap: 2 }}>
          <span className="small muted">{paused ? "Paused" : "Time left"}</span>
          <span className="display tabular" role="timer" aria-live="off" style={{ fontSize: 96, lineHeight: 0.9, letterSpacing: "-3px" }}>
            {clock(left)}
          </span>
        </div>
        <button type="button" className="btn ghost sm auto" onClick={paused ? game.resume : game.pause}>
          {paused ? "Resume" : "Pause"}
        </button>
      </div>
      <div className="bar mt-12" style={{ height: 6 }}>
        <div style={{ width: `${(left / total) * 100}%`, background: left < 6000 ? "var(--coral)" : "var(--lime)" }} />
      </div>

      <div className="card stack mt-24" style={{ gap: 14 }}>
        <div className="row between" style={{ alignItems: "baseline" }}>
          <span className="h2" style={{ fontSize: 24 }}>
            Clue {t.clue} of {MAX_CLUES}
          </span>
          <span className="lime" style={{ fontSize: 14, fontWeight: 700 }}>
            worth {pts} pt{pts === 1 ? "" : "s"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${MAX_CLUES}, minmax(0, 1fr))`, gap: 8 }}>
          {Array.from({ length: MAX_CLUES }, (_, i) => {
            const c = i + 1;
            const state = c < t.clue ? "missed" : c === t.clue ? "now" : "later";
            const style =
              state === "missed"
                ? { background: "var(--coral-bg)", border: "1.5px solid var(--coral)" }
                : state === "now"
                  ? { background: "var(--ink)", color: "var(--dark)" }
                  : { border: "1.5px dashed var(--line-2)" };
            return (
              <div key={c} className="stack center" style={{ height: 56, borderRadius: 16, gap: 0, justifyContent: "center", ...style }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: state === "missed" ? "var(--coral)" : undefined }}>
                  {state === "missed" ? "Missed" : state === "now" ? "Now" : c === MAX_CLUES ? "Last" : "Next"}
                </span>
                <span style={{ fontSize: 13, opacity: state === "now" ? 1 : 0.8 }}>
                  {pointsForClue(c)} pt{pointsForClue(c) === 1 ? "" : "s"}
                </span>
              </div>
            );
          })}
        </div>
        <span className="small muted" style={{ fontSize: 14 }}>
          {giver.name} says one word. {guesser.name} gets one guess.
        </span>
      </div>

      {trouble && (
        <button type="button" className="card alert mt-12 row small" style={{ textAlign: "left", color: "var(--ink)" }} onClick={game.openReveal}>
          <Icon name="eye" size={18} color="var(--coral)" />
          <span className="grow">WhatsApp is having trouble. Show {giver.name} the word on this phone.</span>
        </button>
      )}

      <div className="push stack" style={{ gap: 12 }}>
        <button type="button" className="btn primary xl" onClick={game.correct} disabled={paused}>
          <Icon name="check" size={22} stroke={2.8} />
          Correct · +{pts}
        </button>
        <button type="button" className="btn cream lg" onClick={game.nextClue} disabled={paused}>
          {t.clue >= MAX_CLUES ? "Wrong · end turn" : "Wrong · next clue"}
        </button>
        <div className="row">
          <button type="button" className="btn ghost sm" onClick={game.skip} disabled={skips === 0 || paused}>
            Skip word · {skips} left
          </button>
          <button type="button" className="btn ghost sm" onClick={game.openReveal}>
            Show word here
          </button>
        </div>
      </div>
    </main>
  );
}

function Reveal({ match, onDone }: { match: Match; onDone: () => void }) {
  const t = match.turn!;
  const giver = playerById(match, t.clueGiverId);
  const guesser = playerById(match, t.guesserId);
  const other = match.teams[t.team === 0 ? 1 : 0].name;
  return <RevealInner key={t.word} word={t.word} giver={giver.name} guesser={guesser.name} other={other} turnLabel={`Turn ${t.no} · ${match.teams[t.team].name}`} onDone={onDone} />;
}


function RevealInner({
  word,
  giver,
  guesser,
  other,
  turnLabel,
  onDone,
}: {
  word: string;
  giver: string;
  guesser: string;
  other: string;
  turnLabel: string;
  onDone: () => void;
}) {
  const [shown, setShown] = useState(false);
  return (
    <main className="screen">
      <div className="row between">
        <span className="eyebrow">{turnLabel}</span>
        <span className="small muted" style={{ fontWeight: 600 }}>
          Timer paused
        </span>
      </div>

      {!shown ? (
        <>
          <div className="stack mt-32" style={{ gap: 8 }}>
            <span className="muted" style={{ fontSize: 15 }}>
              Pass the phone to
            </span>
            <span className="display" style={{ fontSize: 56, letterSpacing: "-1.5px" }}>
              {giver}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShown(true)}
            className="card mt-32 stack grow"
            style={{ border: 0, borderRadius: 28, alignItems: "center", justifyContent: "center", gap: 18, color: "var(--ink)", minHeight: 300 }}
          >
            <span style={{ width: 96, height: 96, borderRadius: 48, border: "2px dashed var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="eye" size={40} color="var(--lime)" />
            </span>
            <span className="h2">Tap to see the word</span>
            <span className="small muted center" style={{ maxWidth: 250, fontSize: 14 }}>
              Only {giver} should be looking. {guesser} and {other}, eyes on the snacks.
            </span>
          </button>
        </>
      ) : (
        <>
          <div className="stack mt-32" style={{ gap: 8 }}>
            <span className="muted" style={{ fontSize: 15 }}>
              {giver}, your word is
            </span>
            <span className="display lime" style={{ fontSize: word.length > 9 ? 48 : 72, lineHeight: 0.95, letterSpacing: "-2px", overflowWrap: "anywhere" }}>
              {word}
            </span>
          </div>
          <div className="card stack mt-24">
            <span className="eyebrow">Remember</span>
            <span style={{ fontSize: 15, lineHeight: 1.45 }}>One word per clue. No part of the word, no rhymes, no pointing.</span>
          </div>
          <div className="push">
            <button type="button" className="btn cream" onClick={onDone}>
              Got it · hide and start timer
            </button>
          </div>
        </>
      )}
    </main>
  );
}

function TurnResult({ match, relayOn, onNext }: { match: Match; relayOn: boolean; onNext: () => void }) {
  const t = match.turn!;
  const target = match.settings.targetScore;
  const next = upNext(match);
  const nextGiver = playerById(match, next.clueGiverId);
  const nextGuesser = playerById(match, next.guesserId);
  const headline =
    t.outcome === "correct" ? `got it on clue ${t.clue}` : t.outcome === "timeout" ? "out of time" : "no luck this time";
  const hasPhones = relayOn && match.players.some((p) => p.phone);

  return (
    <main className="screen">
      <span className="eyebrow">
        Turn {t.no} · {headline}
      </span>

      <div className="stack mt-32" style={{ gap: 4 }}>
        <span className="display" style={{ fontSize: 128, lineHeight: 0.85, letterSpacing: "-4px", color: t.points ? "var(--lime)" : "var(--muted)" }}>
          +{t.points}
        </span>
        <span className="row mt-8" style={{ gap: 8, fontSize: 18, fontWeight: 700, color: TEAM_COLORS[t.team] }}>
          <span className="dot" style={{ width: 10, height: 10, borderRadius: 5, background: TEAM_COLORS[t.team] }} />
          {match.teams[t.team].name}
        </span>
        <span className="muted" style={{ fontSize: 15 }}>
          The word was <strong style={{ color: "var(--ink)" }}>{t.word}</strong>
        </span>
      </div>

      <div className="card stack mt-24" style={{ gap: 16 }}>
        <div className="row between small muted" style={{ fontSize: 14 }}>
          <span>Score</span>
          <span>{match.suddenDeath ? "sudden death" : `first to ${target}`}</span>
        </div>
        {([0, 1] as const).map((i) => (
          <div key={i} className="stack" style={{ gap: 8 }}>
            <div className="row between" style={{ fontWeight: 700 }}>
              <span style={{ color: TEAM_COLORS[i] }}>{match.teams[i].name}</span>
              <span className="tabular">{match.scores[i]}</span>
            </div>
            <div className="bar">
              <div style={{ width: `${Math.min(100, (match.scores[i] / target) * 100)}%`, background: TEAM_COLORS[i] }} />
            </div>
          </div>
        ))}
        {hasPhones && (
          <div className="divider row small muted">
            <Icon name="check" size={16} color="var(--lime)" stroke={2.5} />
            Score sent on WhatsApp
          </div>
        )}
      </div>

      <div className="card row mt-16" style={{ borderRadius: 20, padding: 16, gap: 12 }}>
        <Avatar name={nextGiver.name} index={indexOf(match, nextGiver.id)} />
        <div className="stack" style={{ gap: 2 }}>
          <span className="eyebrow" style={{ color: TEAM_COLORS[next.team] }}>
            Up next · {match.teams[next.team].name}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {nextGiver.name} gives clues, {nextGuesser.name} guesses
          </span>
        </div>
      </div>

      <div className="push">
        <button type="button" className="btn primary" onClick={onNext}>
          Next turn
        </button>
      </div>
    </main>
  );
}

function Winner({ match, onPlayAgain, onExit }: { match: Match; onPlayAgain: () => void; onExit: () => void }) {
  const w = match.winner!;
  const l = w === 0 ? 1 : 0;
  const names = match.teams[w].playerIds.map((id) => playerById(match, id).name);
  const skips = match.history.reduce((n, t) => n + t.skipped.length, 0);

  return (
    <main className="screen">
      <span className="eyebrow">Password · final{match.suddenDeath ? " · sudden death" : ""}</span>

      <span className="mt-32" style={{ width: 96, height: 96, borderRadius: 48, background: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dark)" }}>
        <Icon name="trophy" size={48} />
      </span>

      <div className="stack mt-24" style={{ gap: 6 }}>
        <span className="row" style={{ gap: 8, fontSize: 15, fontWeight: 700, color: TEAM_COLORS[w] }}>
          <span className="dot" style={{ width: 10, height: 10, borderRadius: 5, background: TEAM_COLORS[w] }} />
          {names.join(" & ")}
        </span>
        <h1 className="display" style={{ margin: 0, fontSize: 56, lineHeight: 0.98, letterSpacing: "-1.5px" }}>
          {match.teams[w].name}
          <br />
          wins
        </h1>
      </div>

      <div className="row mt-24" style={{ alignItems: "baseline", gap: 12 }}>
        <span className="display tabular" style={{ fontSize: 72 }}>
          {match.scores[w]}
        </span>
        <span className="muted" style={{ fontSize: 28 }}>
          –
        </span>
        <span className="display tabular" style={{ fontSize: 72, color: TEAM_COLORS[l] }}>
          {match.scores[l]}
        </span>
      </div>

      <div className="card mt-24" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, padding: "18px 20px" }}>
        <div className="stack" style={{ gap: 2 }}>
          <span className="small muted" style={{ fontSize: 12 }}>
            Turns
          </span>
          <span className="h2">{match.history.length}</span>
        </div>
        <div className="stack" style={{ gap: 2 }}>
          <span className="small muted" style={{ fontSize: 12 }}>
            Skips used
          </span>
          <span className="h2">{skips}</span>
        </div>
      </div>

      <div className="push stack" style={{ gap: 12 }}>
        <button type="button" className="btn primary" onClick={onPlayAgain}>
          Play again
        </button>
        <Link href="/night" className="btn ghost" onClick={onExit}>
          Back to game night
        </Link>
      </div>
    </main>
  );
}
