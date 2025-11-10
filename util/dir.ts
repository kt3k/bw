import { Dir } from "../model/types.ts"

export const UP = "up" as const
export const DOWN = "down" as const
export const LEFT = "left" as const
export const RIGHT = "right" as const
/** The array of all directions */
export const DIRS = [
  UP,
  DOWN,
  LEFT,
  RIGHT,
] as const
/** Turns the given direction to right */
export function turnRight(dir: Dir): Dir {
  switch (dir) {
    case UP:
      return RIGHT
    case RIGHT:
      return DOWN
    case DOWN:
      return LEFT
    case LEFT:
      return UP
  }
}
/** Turns the given direction to left */
export function turnLeft(dir: Dir): Dir {
  switch (dir) {
    case UP:
      return LEFT
    case LEFT:
      return DOWN
    case DOWN:
      return RIGHT
    case RIGHT:
      return UP
  }
}
/** Returns the opposite direction */
export function opposite(dir: Dir): Dir {
  switch (dir) {
    case UP:
      return DOWN
    case DOWN:
      return UP
    case LEFT:
      return RIGHT
    case RIGHT:
      return LEFT
  }
}
/** Returns the next grid of the given direction from the given position */
export function nextGrid(
  i: number,
  j: number,
  dir: Dir,
  distance = 1,
): [nextI: number, nextJ: number] {
  switch (dir) {
    case UP:
      return [i, j - distance]
    case DOWN:
      return [i, j + distance]
    case LEFT:
      return [i - distance, j]
    case RIGHT:
      return [i + distance, j]
    default:
      dir satisfies never
      throw new Error(`Invalid direction: ${dir}`)
  }
}
