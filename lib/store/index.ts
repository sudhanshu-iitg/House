import type { Match, TeamIndex } from "@/lib/engine";

const KEYS = {
  match: "rounds.match.v1",
  crew: "rounds.crew.v1",
  night: "rounds.night.v1",
  events: "rounds.events.v1",
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); the game still runs in memory.
  }
}

// --- Current match ---------------------------------------------------------

export const loadMatch = () => read<Match>(KEYS.match);
export const saveMatch = (m: Match | null) => write(KEYS.match, m);

// --- Remembered players ----------------------------------------------------

export interface CrewMember {
  name: string;
  phone: string;
}

export const loadCrew = () => read<CrewMember[]>(KEYS.crew) ?? [];

/** Most recent first, capped so the list stays short. */
export function rememberCrew(members: CrewMember[]) {
  write(KEYS.crew, dedupe([...members, ...loadCrew()]).slice(0, 12));
}

function dedupe(list: CrewMember[]) {
  const seen = new Set<string>();
  return list.filter((m) => {
    const k = m.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// --- Game night tally ------------------------------------------------------

export interface NightMatch {
  id: string;
  at: number;
  teams: string[];
  scores: number[];
  winner: TeamIndex;
  suddenDeath: boolean;
  /** Points each player earned as clue-giver, by name. */
  cluePoints: Record<string, number>;
}

export interface Night {
  startedAt: number;
  lastAt: number;
  matches: NightMatch[];
}

/** A night ends after 10 quiet hours. */
const NIGHT_GAP_MS = 10 * 60 * 60 * 1000;

export function loadNight(now = Date.now()): Night | null {
  const night = read<Night>(KEYS.night);
  if (!night || now - night.lastAt > NIGHT_GAP_MS) return null;
  return night;
}

export function recordMatch(match: Match, now = Date.now()): Night {
  const night = loadNight(now) ?? { startedAt: now, lastAt: now, matches: [] };
  if (night.matches.some((m) => m.id === match.id) || match.winner === null) return night;
  const cluePoints: Record<string, number> = {};
  for (const p of match.players) cluePoints[p.name] = 0;
  for (const t of match.history) {
    const name = match.players.find((p) => p.id === t.clueGiverId)?.name;
    if (name) cluePoints[name] += t.points;
  }
  const next: Night = {
    ...night,
    lastAt: now,
    matches: [
      ...night.matches,
      {
        id: match.id,
        at: now,
        teams: match.teams.map((t) => t.name),
        scores: match.scores,
        winner: match.winner,
        suddenDeath: match.suddenDeath,
        cluePoints,
      },
    ],
  };
  write(KEYS.night, next);
  return next;
}

/** The colour slot a team had in its most recent match. */
export function teamSlot(night: Night, team: string): TeamIndex {
  for (let i = night.matches.length - 1; i >= 0; i--) {
    const k = night.matches[i].teams.indexOf(team);
    if (k >= 0) return k;
  }
  return 0;
}

export const clearNight = () => write(KEYS.night, null);

export interface Tally {
  /** The latest match's teams, in their in-game order, so colours match the game. */
  latest: { team: string; wins: number }[];
  wins: { team: string; wins: number }[];
  players: { name: string; points: number }[];
}

export function tallyNight(night: Night): Tally {
  const wins = new Map<string, number>();
  const points = new Map<string, number>();
  for (const m of night.matches) {
    for (const t of m.teams) wins.set(t, wins.get(t) ?? 0);
    const w = m.teams[m.winner];
    wins.set(w, (wins.get(w) ?? 0) + 1);
    for (const [name, pts] of Object.entries(m.cluePoints)) points.set(name, (points.get(name) ?? 0) + pts);
  }
  const latest = (night.matches.at(-1)?.teams ?? []).map((team) => ({ team, wins: wins.get(team) ?? 0 }));
  return {
    latest,
    wins: [...wins].map(([team, n]) => ({ team, wins: n })).sort((a, b) => b.wins - a.wins),
    players: [...points].map(([name, p]) => ({ name, points: p })).sort((a, b) => b.points - a.points),
  };
}

// --- Local-only analytics --------------------------------------------------

export interface LocalEvent {
  name: "match_started" | "match_completed" | "turn_finished" | "skip_used" | "reveal_used" | "notify_failed" | "match_edited";
  at: number;
  data?: Record<string, string | number | boolean>;
}

export function logEvent(name: LocalEvent["name"], data?: LocalEvent["data"]) {
  const events = read<LocalEvent[]>(KEYS.events) ?? [];
  events.push({ name, at: Date.now(), data });
  write(KEYS.events, events.slice(-500));
}
