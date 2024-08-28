import { type Context } from "@kt3k/cell"
import { isLoadingSignal } from "../util/signal.ts"

export function LoadingIndicator({ el }: Context) {
  const toggle = () => el.classList.toggle("hidden", !isLoadingSignal.get())
  isLoadingSignal.onChange(toggle)
  toggle()
}
