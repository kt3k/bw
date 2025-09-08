import type { Context } from "@kt3k/cell"
import * as signal from "../../util/signal.ts"

export function LoadingIndicator({ el, subscribe }: Context) {
  subscribe(signal.isGameLoading, (v) => el.classList.toggle("hidden", !v))
}
