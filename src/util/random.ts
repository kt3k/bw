import seedrandom from "npm:seedrandom"

const rng = seedrandom("Hello.")

/** Returns a random non-negative integer under `n` */
export function randomInt(n: number) {
  return Math.floor(rng() * n)
}
