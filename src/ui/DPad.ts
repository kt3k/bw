import type { Context } from "@kt3k/cell"
import { Input } from "./KeyMonitor.ts"

const dirs = ["up", "down", "left", "right"] as const

export function DPad({ on }: Context) {
  for (const dir of dirs) {
    const delegate = on(`.${dir}`)
    const toggle = (b: boolean) => () => Input[dir] = b
    delegate.mousedown = toggle(true)
    delegate.mouseout = toggle(false)
    delegate.mouseup = toggle(false)
    delegate.touchstart = toggle(true)
    delegate.touchend = toggle(false)
    delegate.touchcancel = toggle(false)
  }
}
