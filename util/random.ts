import seedrandom from "seedrandom"

const { randomInt, choice } = seed("Hello.")

export { choice, randomInt }

export function seed(seed: string) {
  const rng = seedrandom(seed)
  const randomInt = (n: number) => {
    return Math.floor(rng() * n)
  }

  const choice = <T>(arr: T[]) => {
    return arr[randomInt(arr.length)]
  }

  return {
    rng,
    randomInt,
    choice,
  }
}
