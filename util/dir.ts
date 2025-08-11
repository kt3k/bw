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

/**
 * The current user direction input state.
 */
export const Input = {
  up: false,
  down: false,
  left: false,
  right: false,
  space: false,
}

/** Clear the current direction input state */
export function clearInput() {
  for (const dir of DIRS) {
    Input[dir] = false
  }
  Input.space = false
}
