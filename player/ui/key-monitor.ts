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
    if (e.metaKey || e.ctrlKey) {
      return
    } else if (KEY_UP.has(e.key)) {
      e.preventDefault()
      Input.up = true
    } else if (KEY_DOWN.has(e.key)) {
      e.preventDefault()
      Input.down = true
    } else if (KEY_LEFT.has(e.key)) {
      e.preventDefault()
      Input.left = true
    } else if (KEY_RIGHT.has(e.key)) {
      e.preventDefault()
      Input.right = true
    }
  })
  on("keyup", (e) => {
    console.log("keyup", e.key)
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
