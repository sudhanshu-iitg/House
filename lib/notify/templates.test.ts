import { describe, expect, it } from "vitest";
import { parseMessage, render } from "./templates";

const to = "919812345678";

describe("score and winner messages", () => {
  it("keeps the head-to-head line for two teams", () => {
    expect(render({ kind: "score", to, teams: ["Chai", "Coffee"], scores: [5, 3], next: "Rhea" })).toBe(
      "Chai 5 – 3 Coffee · Next: Rhea gives clues",
    );
  });

  it("lists every team when there are more", () => {
    expect(render({ kind: "score", to, teams: ["Chai", "Coffee", "Lassi"], scores: [5, 3, 7], next: "Zoya" })).toBe(
      "Chai 5 · Coffee 3 · Lassi 7\nNext: Zoya gives clues",
    );
    expect(render({ kind: "winner", to, team: "Lassi", scores: [15, 12, 8], tally: "" })).toBe("🏆 Lassi wins 15–12–8! ");
  });

  it("accepts 2 to 6 teams and rejects mismatched scores", () => {
    const score = (n: number, scores = n) => ({ kind: "score", to, teams: Array(n).fill("T"), scores: Array(scores).fill(1), next: "A" });
    expect(parseMessage(score(6))).not.toBeNull();
    expect(parseMessage(score(7))).toBeNull();
    expect(parseMessage(score(1))).toBeNull();
    expect(parseMessage(score(3, 2))).toBeNull();
  });
});
