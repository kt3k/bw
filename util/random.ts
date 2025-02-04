import seedrandom from "npm:seedrandom"

const rng = seedrandom("Hello.")

export { seedrandom }

/** Returns a random non-negative integer under `n` */
export function randomInt(n: number) {
  return Math.floor(rng() * n)
}

export function choice<T>(arr: T[]) {
  return arr[randomInt(arr.length)]
}
