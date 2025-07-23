import type { Context } from "@kt3k/cell"
import * as signal from "../../util/signal.ts"

/** The ui which shows the current fps number */
export function FpsMonitor({ el }: Context) {
  signal.fps.subscribe((fps) => {
    el.textContent = fps.toFixed(2)
  })
}
