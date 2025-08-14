import type { Context } from "@kt3k/cell"
import * as signal from "../../util/signal.ts"

/** The ui which shows the current actors count */
export function ActorsCounter({ el, subscribe }: Context) {
  subscribe(signal.actorsCount, (count) => {
    el.textContent = count.toString()
  })
}
