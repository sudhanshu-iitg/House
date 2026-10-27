import { describe, expect, it } from "vitest";
import { PACKS, wordsFor } from "./index";

describe("levels", () => {
  it("splits every pack into easy and tricky words that add up to the whole pack", () => {
    for (const p of PACKS) {
      const easy = wordsFor(p.id, "easy");
      const tricky = wordsFor(p.id, "tricky");
      expect(easy.length + tricky.length).toBe(p.words.length);
      expect(easy.length).toBeGreaterThan(20);
      expect(tricky.length).toBeGreaterThan(20);
      expect(easy.some((w) => tricky.includes(w))).toBe(false);
    }
  });

  it("plays mixed when no level is set", () => {
    expect(wordsFor("food")).toBe(PACKS.find((p) => p.id === "food")!.words);
  });
});
