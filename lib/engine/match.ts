import type { Match, Player, Settings, Team, TeamIndex, Turn, TurnOutcome } from "./types";

export const MAX_CLUES = 3;
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;

export const DEFAULT_SETTINGS: Settings = {
  turnSeconds: 30,
  targetScore: 15,
  skipsPerTurn: 1,
  packId: "everyday",
  level: "mixed",
};

/** 3 points on clue 1, 2 on clue 2, 1 on clue 3. */
export function pointsForClue(clue: number): number {
  return Math.max(0, MAX_CLUES + 1 - clue);
}

export function createMatch(opts: {
  id: string;
  now: number;
  players: Player[];
  teams: Team[];
  settings?: Partial<Settings>;
  startingTeam?: TeamIndex;
}): Match {
  if (opts.teams.length < MIN_TEAMS || opts.teams.length > MAX_TEAMS) throw new Error(`Play with ${MIN_TEAMS} to ${MAX_TEAMS} teams`);
  for (const team of opts.teams) {
    if (team.playerIds.length < 2) throw new Error(`${team.name} needs at least 2 players`);
  }
  return {
    id: opts.id,
    createdAt: opts.now,
    settings: { ...DEFAULT_SETTINGS, ...opts.settings },
    players: opts.players,
    teams: opts.teams,
    startingTeam: opts.startingTeam ?? 0,
    scores: opts.teams.map(() => 0),
    phase: "ready",
    turn: null,
    history: [],
    suddenDeath: false,
    winner: null,
  };
}

/** Who plays turn number `no` (1-based). Teams take turns in order; within a team the clue-giver rotates. */
export function lineupFor(match: Match, no: number): { team: TeamIndex; clueGiverId: string; guesserId: string } {
  const n = match.teams.length;
  const team = (match.startingTeam + no - 1) % n;
  const ids = match.teams[team].playerIds;
  const k = Math.floor((no - 1) / n);
  return {
    team,
    clueGiverId: ids[k % ids.length],
    guesserId: ids[(k + 1) % ids.length],
  };
}

export function nextTurnNo(match: Match): number {
  return match.history.length + 1;
}

export function upNext(match: Match) {
  return lineupFor(match, nextTurnNo(match));
}

export function playerById(match: Match, id: string): Player {
  const p = match.players.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown player ${id}`);
  return p;
}

export function remainingMs(turn: Turn, now: number): number {
  if (turn.pausedMs !== null) return turn.pausedMs;
  if (turn.endsAt === null) return 0;
  return Math.max(0, turn.endsAt - now);
}

export function skipsLeft(match: Match): number {
  if (!match.turn) return match.settings.skipsPerTurn;
  return Math.max(0, match.settings.skipsPerTurn - match.turn.skipped.length);
}

export type Action =
  | { type: "start_turn"; word: string; now: number }
  | { type: "correct"; now: number }
  | { type: "next_clue"; now: number }
  | { type: "skip"; word: string; now: number }
  | { type: "timeout"; now: number }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "continue" }
  /** Between turns: switch the word pack or level, or fix players' WhatsApp numbers (by player id). */
  | { type: "edit"; settings?: Partial<Pick<Settings, "packId" | "level">>; phones?: Record<string, string> };

/** Pure reducer. Invalid actions for the current phase return the match unchanged. */
export function reduce(match: Match, action: Action): Match {
  switch (action.type) {
    case "start_turn": {
      if (match.phase !== "ready") return match;
      const no = nextTurnNo(match);
      const lineup = lineupFor(match, no);
      const turn: Turn = {
        no,
        ...lineup,
        word: action.word,
        skipped: [],
        clue: 1,
        startedAt: action.now,
        endsAt: action.now + match.settings.turnSeconds * 1000,
        pausedMs: null,
        outcome: null,
        points: 0,
      };
      return { ...match, phase: "live", turn };
    }
    case "correct":
      return live(match, (turn) => finishTurn(match, turn, "correct", pointsForClue(turn.clue)));
    case "next_clue":
      return live(match, (turn) =>
        turn.clue >= MAX_CLUES ? finishTurn(match, turn, "missed", 0) : { ...match, turn: { ...turn, clue: turn.clue + 1 } },
      );
    case "timeout":
      return live(match, (turn) => (remainingMs(turn, action.now) > 0 ? match : finishTurn(match, turn, "timeout", 0)));
    case "skip":
      return live(match, (turn) => {
        if (turn.skipped.length >= match.settings.skipsPerTurn) return match;
        return { ...match, turn: { ...turn, skipped: [...turn.skipped, turn.word], word: action.word, clue: 1 } };
      });
    case "pause":
      return live(match, (turn) =>
        turn.pausedMs !== null ? match : { ...match, turn: { ...turn, pausedMs: remainingMs(turn, action.now), endsAt: null } },
      );
    case "resume":
      return live(match, (turn) =>
        turn.pausedMs === null ? match : { ...match, turn: { ...turn, endsAt: action.now + turn.pausedMs, pausedMs: null } },
      );
    case "continue":
      if (match.phase !== "result") return match;
      return { ...match, phase: "ready" };
    case "edit": {
      if (match.phase !== "ready" && match.phase !== "result") return match;
      const phones = action.phones ?? {};
      return {
        ...match,
        settings: { ...match.settings, ...action.settings },
        players: match.players.map((p) => (p.id in phones ? { ...p, phone: phones[p.id] } : p)),
      };
    }
  }
}

function live(match: Match, fn: (turn: Turn) => Match): Match {
  if (match.phase !== "live" || !match.turn) return match;
  return fn(match.turn);
}

function finishTurn(match: Match, turn: Turn, outcome: TurnOutcome, points: number): Match {
  const done: Turn = { ...turn, outcome, points, endsAt: null, pausedMs: null };
  const scores = [...match.scores];
  scores[turn.team] += points;
  const next: Match = { ...match, scores, turn: done, history: [...match.history, done], phase: "result" };
  return checkWinner(next);
}

/**
 * The win is checked only once every team has played the round, so going first is no advantage.
 * The single top team at or over the target wins; a tie for the top at or over the target goes to
 * sudden death, which is the same check after every following round.
 */
function checkWinner(match: Match): Match {
  const roundComplete = match.history.length % match.teams.length === 0;
  if (!roundComplete) return match;
  const top = Math.max(...match.scores);
  if (top < match.settings.targetScore) return match;
  const leaders = match.scores.flatMap((s, i) => (s === top ? [i] : []));
  if (leaders.length > 1) return { ...match, suddenDeath: true };
  return { ...match, phase: "over", winner: leaders[0] };
}
