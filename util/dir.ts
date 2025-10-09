export const UP = "up"
export const DOWN = "down"
export const LEFT = "left"
export const RIGHT = "right"
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
export type Dir = typeof DIRS[number]
