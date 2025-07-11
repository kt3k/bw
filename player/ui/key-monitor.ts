import type { Context } from "@kt3k/cell"
import { Input } from "../../util/dir.ts"

const KEY_UP = new Set(["ArrowUp", "w", "k"])
const KEY_DOWN = new Set(["ArrowDown", "s", "j"])
const KEY_LEFT = new Set(["ArrowLeft", "a", "h"])
const KEY_RIGHT = new Set(["ArrowRight", "d", "l"])

/** The component which monitors the user input.
 *
 * Mount <body> tag.
 */
export function KeyMonitor({ on }: Context) {
  on("keydown", (e) => {
    if (KEY_UP.has(e.key)) {
      Input.up = true
    } else if (KEY_DOWN.has(e.key)) {
      Input.down = true
    } else if (KEY_LEFT.has(e.key)) {
      Input.left = true
    } else if (KEY_RIGHT.has(e.key)) {
      Input.right = true
    } else {
      return
    }
    e.preventDefault() // Prevent default browser behavior
  })
  on("keyup", (e) => {
    if (KEY_UP.has(e.key)) {
      Input.up = false
    } else if (KEY_DOWN.has(e.key)) {
      Input.down = false
    } else if (KEY_LEFT.has(e.key)) {
      Input.left = false
    } else if (KEY_RIGHT.has(e.key)) {
      Input.right = false
    }
  })
}
