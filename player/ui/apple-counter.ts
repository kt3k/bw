import type { Context } from "@kt3k/cell"
import { appleCountSignal } from "../../util/signal.ts"

/** The ui which shows the current fps number */
export function AppleCounter({ query, subscribe }: Context) {
  subscribe(appleCountSignal, (apples) => {
    setTimeout(() => {
      const counter = query(".count-label")
      if (counter) {
        counter.textContent = apples.toString()
      }
    }, 300)
  })
}
