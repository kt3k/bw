import type { Context } from "@kt3k/cell"
import * as signal from "../../util/signal.ts"

/** Monitors the current fps number */
export function FpsMonitor({ el }: Context) {
  signal.fps.subscribe((fps) => {
    el.textContent = fps.toFixed(2)
  })
}

/** Monitors the current v value */
export function VMonitor({ el }: Context) {
  signal.v.subscribe((v) => {
    el.textContent = v.toFixed(2)
  })
}
