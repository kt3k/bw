import { Context } from "@kt3k/cell"
import { fpsSignal } from "../util/signal.ts"

/** The ui which shows the current fps number */
export function FpsMonitor({ el }: Context) {
  fpsSignal.onChange((fps) => {
    el.textContent = fps.toFixed(2)
  })
  return "0"
}
