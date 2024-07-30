import { Context } from "@kt3k/cell"
import { eventHub } from "../util/eventhub.ts"

/** The ui which shows the current fps number */
export function FpsMonitor({ el }: Context) {
  eventHub.on("fps", (fps) => {
    el.textContent = fps.toFixed(2)
  })
  return "0"
}
