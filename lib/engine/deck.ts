/** Picks words without repeats until the pack runs out, then starts over. */
export function drawWord(pack: readonly string[], used: ReadonlySet<string>, random: () => number = Math.random): string {
  const fresh = pack.filter((w) => !used.has(w));
  const pool = fresh.length > 0 ? fresh : pack;
  return pool[Math.floor(random() * pool.length)];
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
