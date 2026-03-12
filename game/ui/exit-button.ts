import type { Context } from "@kt3k/cell"
import * as signals from "../../util/signals.ts"

export function ExitButton({ el, on, subscribe }: Context) {
  on("click", () => {
    console.log("Exit button clicked")
    const [i, j] = [-9964, -9981]
    location.hash = ""
    setTimeout(() => {
      location.replace(`#${i},${j}`)
    }, 10)
  })

  subscribe(signals.currentBlock, (block) => {
    if (block) {
      el.classList.toggle("hidden", !block.config.showsExitButton)
    }
  })
}
