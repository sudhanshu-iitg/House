/**
 * Every WhatsApp message the game can send. The server renders these, so the relay can only ever
 * send game messages, never arbitrary text. The agent only delivers them.
 */
export type NotifyMessage =
  | { kind: "welcome"; to: string; name: string; team: string }
  | { kind: "word"; to: string; turnNo: number; word: string }
  | { kind: "skip"; to: string; word: string }
  | { kind: "score"; to: string; teams: string[]; scores: number[]; next: string }
  /** `scores` starts with the winner's, then the rest from high to low. */
  | { kind: "winner"; to: string; team: string; scores: number[]; tally: string };

export interface OutgoingMessage {
  to: string;
  text: string;
  /** Stable per message so a retry never double-sends. */
  key: string;
}

const MAX_FIELD = 40;
/** Matches have 2 to 6 teams. */
const MAX_TEAMS = 6;

function clean(s: string): string {
  return String(s).replace(/[*_~`\n\r]/g, "").slice(0, MAX_FIELD).trim();
}

function num(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(999, Math.round(n))) : 0;
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function isValidPhone(digits: string): boolean {
  return /^\d{8,15}$/.test(digits);
}

export function render(m: NotifyMessage): string {
  switch (m.kind) {
    case "welcome":
      return `👋 Hi ${clean(m.name)}! You're on *${clean(m.team)}* for Password tonight. Your secret words will arrive here, so keep WhatsApp handy.`;
    case "word":
      return `🔒 Turn ${num(m.turnNo)} · Your word: *${clean(m.word)}*\nOne-word clues only. Don't show anyone.`;
    case "skip":
      return `🔁 New word: *${clean(m.word)}*`;
    case "score":
      if (m.teams.length === 2) {
        return `${clean(m.teams[0])} ${num(m.scores[0])} – ${num(m.scores[1])} ${clean(m.teams[1])} · Next: ${clean(m.next)} gives clues`;
      }
      return `${m.teams.map((t, i) => `${clean(t)} ${num(m.scores[i])}`).join(" · ")}\nNext: ${clean(m.next)} gives clues`;
    case "winner":
      return `🏆 ${clean(m.team)} wins ${m.scores.map(num).join("–")}! ${clean(m.tally)}`;
  }
}

/** Validates untrusted JSON from the client. Returns null when anything is off. */
export function parseMessage(raw: unknown): NotifyMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const to = typeof m.to === "string" ? m.to : "";
  if (!isValidPhone(to)) return null;
  const str = (v: unknown) => (typeof v === "string" && v.length <= 200 ? v : null);
  const many = <T,>(v: unknown, check: (x: unknown) => T | null): T[] | null => {
    if (!Array.isArray(v) || v.length < 2 || v.length > MAX_TEAMS) return null;
    const out = v.map(check);
    return out.some((x) => x === null) ? null : (out as T[]);
  };
  const n = (v: unknown) => (typeof v === "number" ? v : null);
  switch (m.kind) {
    case "welcome": {
      const name = str(m.name);
      const team = str(m.team);
      return name && team ? { kind: "welcome", to, name, team } : null;
    }
    case "word": {
      const word = str(m.word);
      const turnNo = n(m.turnNo);
      return word && turnNo !== null ? { kind: "word", to, word, turnNo } : null;
    }
    case "skip": {
      const word = str(m.word);
      return word ? { kind: "skip", to, word } : null;
    }
    case "score": {
      const teams = many(m.teams, str);
      const scores = many(m.scores, n);
      const next = str(m.next);
      return teams && scores && teams.length === scores.length && next ? { kind: "score", to, teams, scores, next } : null;
    }
    case "winner": {
      const team = str(m.team);
      const scores = many(m.scores, n);
      const tally = str(m.tally);
      return team && scores && tally !== null ? { kind: "winner", to, team, scores, tally } : null;
    }
    default:
      return null;
  }
}
