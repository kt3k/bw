import type { Context } from "@kt3k/cell"

import { clearInput, Input } from "../../util/dir.ts"
import { getDir, getDistance } from "../../util/touch.ts"
import { inputQueue } from "./input-queue.ts"

const TOUCH_SENSITIVITY_THRESHOLD = 25

export function SwipeHandler({ on }: Context) {
  let prevTouch: Touch | undefined
  on("touchstart", (e) => {
    prevTouch = e.touches[0]
  })
  // passive false is necessary to prevent scrolling in iOS Safari
  on("touchmove", { passive: false }, (e) => {
    e.preventDefault()
    const touch = e.changedTouches[0]
    if (prevTouch) {
      const dist = getDistance(touch, prevTouch)
      if (dist < TOUCH_SENSITIVITY_THRESHOLD) {
        return
      }
      clearInput()
      const dir = getDir(touch, prevTouch)
      Input[dir] = true
    }
    prevTouch = touch
  })
  on("touchend", () => {
    if (Input.up || Input.down || Input.left || Input.right) {
      clearInput()
    } else {
      inputQueue.push("touchendempty")
    }
  })
}
