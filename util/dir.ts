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
export type Dir = typeof DIRS[number]
