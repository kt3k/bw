import seedrandom from "seedrandom"

const { randomInt, choice, shuffle } = seed("Hello.")

export { choice, randomInt, shuffle }

export function seed(seed: string) {
  const rng = seedrandom(seed)
  const randomInt = (n: number) => {
    return Math.floor(rng() * n)
  }

  const choice = <T>(arr: readonly T[]) => {
    if (arr.length === 0) {
      throw new Error("Cannot choose from an empty array")
    }
    return arr[randomInt(arr.length)]
  }

  const shuffle = <T>(arr: T[]): T[] => {
    const result = arr.slice()
    for (let i = result.length - 1; i > 0; i--) {
      const j = randomInt(i + 1)
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  return {
    rng,
    randomInt,
    choice,
    shuffle,
  }
}
