export type TeamIndex = 0 | 1;

export interface Player {
  id: string;
  name: string;
  /** Digits with country code, e.g. "919812345210". Empty means reveal-on-host only. */
  phone: string;
}

export interface Team {
  name: string;
  /** Player ids in clue-giving order. */
  playerIds: string[];
}

export interface Settings {
  turnSeconds: number;
  targetScore: number;
  skipsPerTurn: number;
  packId: string;
}

export type TurnOutcome = "correct" | "missed" | "timeout";

export interface Turn {
  /** 1-based turn number across the match. */
  no: number;
  team: TeamIndex;
  clueGiverId: string;
  guesserId: string;
  word: string;
  /** Words skipped this turn, oldest first. */
  skipped: string[];
  /** Current clue, 1..3. */
  clue: number;
  /** Epoch ms when the timer runs out; null while paused. */
  endsAt: number | null;
  /** Remaining ms while paused. */
  pausedMs: number | null;
  startedAt: number;
  outcome: TurnOutcome | null;
  points: number;
}

export type Phase = "ready" | "live" | "result" | "over";

export interface Match {
  id: string;
  createdAt: number;
  settings: Settings;
  players: Player[];
  teams: [Team, Team];
  /** Which team plays turn 1. */
  startingTeam: TeamIndex;
  scores: [number, number];
  phase: Phase;
  /** The turn being played or just finished. */
  turn: Turn | null;
  history: Turn[];
  suddenDeath: boolean;
  winner: TeamIndex | null;
}
