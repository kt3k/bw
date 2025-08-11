import { DIRS } from "../../util/dir.ts"

type QueueInput = "space" | "touchendempty"
export const inputQueue: QueueInput[] = []

/**
 * The current user direction input state.
 */
export const Input = {
  up: false,
  down: false,
  left: false,
  right: false,
}

/** Clear the current direction input state */
export function clearInput() {
  for (const dir of DIRS) {
    Input[dir] = false
  }
}
