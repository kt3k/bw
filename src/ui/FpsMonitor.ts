import { Context } from "@kt3k/cell"

/** The ui which shows the current fps number */
export function FpsMonitor({ sub, on, el }: Context) {
  sub("fps")
  on.fps = (e: CustomEvent) => {
    el.textContent = e.detail.toFixed(2)
  }
  return "0"
}
