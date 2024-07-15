import type { Context } from "@kt3k/cell"

import { clearInput, Input } from "../util/dir.ts"
import { getDir, getDistance } from "../util/touch.ts"

export function SwipeHandler({ on }: Context) {
  let prevTouch: Touch | undefined
  on.touchstart = (e: TouchEvent) => {
    prevTouch = e.touches[0]
  }
  on({ passive: false }).touchmove = (e: TouchEvent) => {
    e.preventDefault()
    const touch = e.changedTouches[0]
    if (prevTouch) {
      const dist = getDistance(touch, prevTouch)
      if (dist < 25) {
        return
      }
      clearInput()
      const dir = getDir(touch, prevTouch)
      Input[dir] = true
    }
    prevTouch = touch
  }
  on.touchend = () => {
    clearInput()
  }
}
