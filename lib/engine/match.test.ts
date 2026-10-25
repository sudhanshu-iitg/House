import { describe, expect, it } from "vitest";
import { createMatch, lineupFor, pointsForClue, reduce, remainingMs, type Action, type Match } from "./index";
import { drawWord } from "./deck";

const players = [
  { id: "p", name: "Priya", phone: "" },
  { id: "a", name: "Aman", phone: "" },
  { id: "r", name: "Rhea", phone: "" },
  { id: "k", name: "Kabir", phone: "" },
];

function newMatch(target = 15): Match {
  return createMatch({
    id: "m1",
    now: 0,
    players,
    teams: [
      { name: "Chai", playerIds: ["p", "a"] },
      { name: "Coffee", playerIds: ["r", "k"] },
    ],
    settings: { targetScore: target },
  });
}

function run(match: Match, ...actions: Action[]): Match {
  return actions.reduce(reduce, match);
}

/** Plays one full turn: start, then `wrong` wrong clues, then correct (or nothing if correctOn is null). */
function playTurn(match: Match, correctOn: number | null): Match {
  let m = reduce(match, { type: "start_turn", word: "MANGO", now: 1000 });
  const misses = correctOn === null ? 3 : correctOn - 1;
  for (let i = 0; i < misses; i++) m = reduce(m, { type: "next_clue", now: 1000 });
  if (correctOn !== null) m = reduce(m, { type: "correct", now: 1000 });
  return m.phase === "result" ? reduce(m, { type: "continue" }) : m;
}

describe("scoring", () => {
  it("gives 3, 2, 1 points by clue", () => {
    expect([1, 2, 3].map(pointsForClue)).toEqual([3, 2, 1]);
  });

  it("scores a correct guess on clue 2", () => {
    const m = run(newMatch(), { type: "start_turn", word: "MANGO", now: 0 }, { type: "next_clue", now: 1 }, { type: "correct", now: 2 });
    expect(m.scores).toEqual([2, 0]);
    expect(m.phase).toBe("result");
    expect(m.turn?.outcome).toBe("correct");
  });

  it("ends the turn with 0 after the third wrong clue", () => {
    const m = run(
      newMatch(),
      { type: "start_turn", word: "MANGO", now: 0 },
      { type: "next_clue", now: 1 },
      { type: "next_clue", now: 2 },
      { type: "next_clue", now: 3 },
    );
    expect(m.phase).toBe("result");
    expect(m.turn?.outcome).toBe("missed");
    expect(m.scores).toEqual([0, 0]);
  });
});

describe("turn order", () => {
  it("alternates teams and swaps roles within a team", () => {
    const m = newMatch();
    expect([1, 2, 3, 4].map((n) => lineupFor(m, n))).toEqual([
      { team: 0, clueGiverId: "p", guesserId: "a" },
      { team: 1, clueGiverId: "r", guesserId: "k" },
      { team: 0, clueGiverId: "a", guesserId: "p" },
      { team: 1, clueGiverId: "k", guesserId: "r" },
    ]);
  });
});

describe("starting team", () => {
  it("lets the second team go first in a rematch", () => {
    const m = { ...newMatch(), startingTeam: 1 as const };
    expect(lineupFor(m, 1)).toEqual({ team: 1, clueGiverId: "r", guesserId: "k" });
    expect(lineupFor(m, 2)).toEqual({ team: 0, clueGiverId: "p", guesserId: "a" });
  });
});

describe("timer", () => {
  it("ignores a timeout before the time is up, then ends the turn", () => {
    let m = reduce(newMatch(), { type: "start_turn", word: "MANGO", now: 0 });
    m = reduce(m, { type: "timeout", now: 29_000 });
    expect(m.phase).toBe("live");
    m = reduce(m, { type: "timeout", now: 30_000 });
    expect(m.phase).toBe("result");
    expect(m.turn?.outcome).toBe("timeout");
  });

  it("freezes remaining time while paused", () => {
    let m = reduce(newMatch(), { type: "start_turn", word: "MANGO", now: 0 });
    m = reduce(m, { type: "pause", now: 10_000 });
    expect(remainingMs(m.turn!, 50_000)).toBe(20_000);
    m = reduce(m, { type: "timeout", now: 50_000 });
    expect(m.phase).toBe("live");
    m = reduce(m, { type: "resume", now: 50_000 });
    expect(remainingMs(m.turn!, 55_000)).toBe(15_000);
  });
});

describe("skip", () => {
  it("swaps the word, resets clues, and is limited per turn", () => {
    let m = run(newMatch(), { type: "start_turn", word: "MANGO", now: 0 }, { type: "next_clue", now: 1 });
    m = reduce(m, { type: "skip", word: "TRAIN", now: 2 });
    expect(m.turn?.word).toBe("TRAIN");
    expect(m.turn?.clue).toBe(1);
    expect(m.turn?.skipped).toEqual(["MANGO"]);
    const again = reduce(m, { type: "skip", word: "KITE", now: 3 });
    expect(again).toBe(m);
  });
});

describe("winning", () => {
  it("waits for the round to finish before declaring a winner", () => {
    let m = newMatch(3);
    m = playTurn(m, 1); // Chai reaches 3
    expect(m.phase).toBe("ready");
    expect(m.winner).toBeNull();
    m = playTurn(m, 2); // Coffee 2, round over
    expect(m.phase).toBe("over");
    expect(m.winner).toBe(0);
  });

  it("lets the second team overtake in the same round", () => {
    let m = newMatch(2);
    m = playTurn(m, 2); // Chai 2
    m = reduce(m, { type: "start_turn", word: "MANGO", now: 0 });
    m = reduce(m, { type: "correct", now: 0 }); // Coffee 3
    expect(m.phase).toBe("over");
    expect(m.winner).toBe(1);
  });

  it("goes to sudden death on a tie at the target", () => {
    let m = newMatch(3);
    m = playTurn(m, 1);
    m = playTurn(m, 1);
    expect(m.suddenDeath).toBe(true);
    expect(m.phase).toBe("ready");
    m = playTurn(m, 2); // Chai 5
    m = playTurn(m, null); // Coffee 3
    expect(m.phase).toBe("over");
    expect(m.winner).toBe(0);
  });

  it("ignores turn actions once the match is over", () => {
    let m = newMatch(3);
    m = playTurn(m, 1);
    m = playTurn(m, null);
    expect(reduce(m, { type: "start_turn", word: "X", now: 0 })).toBe(m);
  });
});

describe("deck", () => {
  it("avoids used words until the pack runs out", () => {
    expect(drawWord(["A", "B"], new Set(["A"]), () => 0)).toBe("B");
    expect(drawWord(["A", "B"], new Set(["A", "B"]), () => 0)).toBe("A");
  });
});
