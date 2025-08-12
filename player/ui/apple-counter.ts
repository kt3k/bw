import type { Context } from "@kt3k/cell"
import * as signal from "../../util/signal.ts"

/** The ui which shows the current fps number */
export function AppleCounter({ query, subscribe }: Context) {
  subscribe(signal.appleCount, (apples) => {
    setTimeout(() => {
      const counter = query(".count-label")
      if (counter) {
        counter.textContent = apples.toString()
      }
    }, 300)
  })

  subscribe(signal.greenAppleCount, (greenApples) => {
    setTimeout(() => {
      const counter = query(".green-apple-count-label")
      if (counter) {
        counter.textContent = greenApples.toString()
      }
    }, 300)
  })
}
