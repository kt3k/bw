import { Dir } from "../model/types.ts"

export const UP = "up" as const
export const DOWN = "down" as const
export const LEFT = "left" as const
export const RIGHT = "right" as const
export const DIRS = [
  UP,
  DOWN,
  LEFT,
  RIGHT,
] as const
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
