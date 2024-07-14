import type { Context } from "@kt3k/cell"
import { Input } from "../util/dir.ts"
import { DIRS } from "../util/dir.ts"

export function DPad({ on }: Context) {
  for (const dir of DIRS) {
    const target = on(`.${dir}`)
    const set = (b: boolean) => () => Input[dir] = b
    target.mousedown = set(true)
    target.mouseout = set(false)
    target.mouseup = set(false)
    target.touchstart = set(true)
    target.touchend = set(false)
    target.touchcancel = set(false)
  }
}
