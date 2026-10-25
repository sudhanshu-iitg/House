"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { drawWord, playerById, reduce, remainingMs, upNext, type Action, type Match, type Turn } from "@/lib/engine";
import { getPack } from "@/lib/words";
import { relayConfigured, sendMessages } from "@/lib/notify/client";
import { isValidPhone, type NotifyMessage } from "@/lib/notify/templates";
import { logEvent, recordMatch, saveMatch, tallyNight } from "@/lib/store";

export type Delivery =
  | { state: "idle" }
  | { state: "sending"; slow: boolean }
  | { state: "sent" }
  | { state: "failed" }
  /** No number for this player, or WhatsApp not set up: the word shows on the host phone. */
  | { state: "local" };

const SLOW_AFTER_MS = 5_000;

function usedWords(m: Match): Set<string> {
  const used = new Set<string>();
  for (const t of m.history) [t.word, ...t.skipped].forEach((w) => used.add(w));
  if (m.turn) [m.turn.word, ...m.turn.skipped].forEach((w) => used.add(w));
  return used;
}

function phonesOf(m: Match): string[] {
  return m.players.map((p) => p.phone).filter(isValidPhone);
}

export function useGame(initial: Match) {
  const [match, setMatch] = useState(initial);
  const ref = useRef(initial);
  const [delivery, setDelivery] = useState<Delivery>({ state: "idle" });
  const [revealOpen, setRevealOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const attempt = useRef(0);
  const [relayOn, setRelayOn] = useState(false);

  useEffect(() => {
    relayConfigured().then(setRelayOn);
  }, []);

  const commit = useCallback((next: Match) => {
    ref.current = next;
    setMatch(next);
    setNow(Date.now());
    saveMatch(next);
  }, []);

  const notifyAll = useCallback((m: Match, key: string, build: (to: string) => NotifyMessage) => {
    const phones = phonesOf(m);
    if (phones.length === 0) return;
    sendMessages({ key, messages: phones.map(build) }).then((r) => {
      if (!r.ok) logEvent("notify_failed", { kind: key.split(":").pop() ?? "", reason: r.reason });
    });
  }, []);

  const onTurnEnd = useCallback(
    (m: Match) => {
      const t = m.turn!;
      setRevealOpen(false);
      setDelivery({ state: "idle" });
      logEvent("turn_finished", {
        outcome: t.outcome ?? "",
        points: t.points,
        seconds: Math.round((Date.now() - t.startedAt) / 1000),
        skips: t.skipped.length,
      });
      const teams: [string, string] = [m.teams[0].name, m.teams[1].name];
      if (m.phase === "over" && m.winner !== null) {
        const night = recordMatch(m);
        logEvent("match_completed", { turns: m.history.length, suddenDeath: m.suddenDeath });
        const tally = tallyNight(night)
          .wins.map((w) => `${w.team} ${w.wins}`)
          .join(", ");
        const s = m.scores;
        const scores: [number, number] = m.winner === 0 ? [s[0], s[1]] : [s[1], s[0]];
        notifyAll(m, `${m.id}:${t.no}:winner`, (to) => ({ kind: "winner", to, team: teams[m.winner!], scores, tally: `Tonight: ${tally}` }));
      } else {
        const next = playerById(m, upNext(m).clueGiverId).name;
        notifyAll(m, `${m.id}:${t.no}:score`, (to) => ({ kind: "score", to, teams, scores: m.scores, next }));
      }
    },
    [notifyAll],
  );

  const dispatch = useCallback(
    (action: Action) => {
      const prev = ref.current;
      const next = reduce(prev, action);
      if (next === prev) return prev;
      commit(next);
      if (prev.phase === "live" && next.phase !== "live") onTurnEnd(next);
      return next;
    },
    [commit, onTurnEnd],
  );

  /** Words that can't go over WhatsApp show on this phone right away, with the timer held. */
  const showLocally = useCallback(() => {
    setDelivery({ state: "local" });
    if (ref.current.phase !== "live") return;
    dispatch({ type: "pause", now: Date.now() });
    setRevealOpen(true);
  }, [dispatch]);

  const sendWord = useCallback(
    (m: Match, turn: Turn, kind: "word" | "skip") => {
      const id = ++attempt.current;
      const to = playerById(m, turn.clueGiverId).phone;
      if (!isValidPhone(to)) {
        showLocally();
        return;
      }
      setDelivery({ state: "sending", slow: false });
      const slowTimer = setTimeout(() => {
        if (attempt.current === id) setDelivery({ state: "sending", slow: true });
      }, SLOW_AFTER_MS);
      const message: NotifyMessage = kind === "word" ? { kind, to, word: turn.word, turnNo: turn.no } : { kind, to, word: turn.word };
      sendMessages({ key: `${m.id}:${turn.no}:${kind}${turn.skipped.length}`, messages: [message] }).then((r) => {
        clearTimeout(slowTimer);
        if (attempt.current !== id) return;
        if (r.ok) setDelivery({ state: "sent" });
        else {
          logEvent("notify_failed", { kind, reason: r.reason });
          if (r.reason === "not_configured") showLocally();
          else setDelivery({ state: "failed" });
        }
      });
    },
    [showLocally],
  );

  const startTurn = useCallback(() => {
    const m = ref.current;
    const word = drawWord(getPack(m.settings.packId).words, usedWords(m));
    const next = dispatch({ type: "start_turn", word, now: Date.now() });
    if (next.turn && next.phase === "live") sendWord(next, next.turn, "word");
  }, [dispatch, sendWord]);

  const skip = useCallback(() => {
    const m = ref.current;
    const word = drawWord(getPack(m.settings.packId).words, usedWords(m));
    const next = dispatch({ type: "skip", word, now: Date.now() });
    if (next !== m && next.turn) {
      logEvent("skip_used");
      if (revealOpen) return; // The clue-giver is already looking at this phone.
      sendWord(next, next.turn, "skip");
    }
  }, [dispatch, sendWord, revealOpen]);

  const openReveal = useCallback(() => {
    logEvent("reveal_used", { delivery: delivery.state });
    dispatch({ type: "pause", now: Date.now() });
    setRevealOpen(true);
  }, [dispatch, delivery.state]);

  const closeReveal = useCallback(() => {
    setRevealOpen(false);
    dispatch({ type: "resume", now: Date.now() });
  }, [dispatch]);

  // Tick the clock and end the turn when time runs out.
  useEffect(() => {
    if (match.phase !== "live") return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const turn = ref.current.turn;
      if (turn && remainingMs(turn, t) <= 0) dispatch({ type: "timeout", now: t });
    }, 200);
    return () => clearInterval(id);
  }, [match.phase, dispatch]);

  return {
    match,
    now,
    relayOn,
    delivery,
    revealOpen,
    startTurn,
    correct: () => dispatch({ type: "correct", now: Date.now() }),
    nextClue: () => dispatch({ type: "next_clue", now: Date.now() }),
    skip,
    pause: () => dispatch({ type: "pause", now: Date.now() }),
    resume: () => dispatch({ type: "resume", now: Date.now() }),
    proceed: () => dispatch({ type: "continue" }),
    openReveal,
    closeReveal,
  };
}
