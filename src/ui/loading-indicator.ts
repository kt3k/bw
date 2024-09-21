import { type Context } from "@kt3k/cell"
import { isLoadingSignal } from "../util/signal.ts"

export function LoadingIndicator({ el }: Context) {
  isLoadingSignal.subscribe((v) => el.classList.toggle("hidden", !v))
}
