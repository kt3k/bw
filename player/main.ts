import { register } from "@kt3k/cell"
import { clearInput } from "./ui/input.ts"
import { KeyMonitor } from "./ui/key-monitor.ts"
import { FpsMonitor, VMonitor } from "./ui/fps-monitor.ts"
import { ActorsCounter } from "./ui/actors-counter.ts"
import { SwipeHandler } from "./ui/swipe-handler.ts"
import { ItemGetEffector } from "./ui/item-get-effector.ts"
import { LoadingIndicator } from "./ui/loading-indicator.ts"
import { AppleCounter } from "./ui/apple-counter.ts"
import { GameScreen } from "./game-screen.ts"

globalThis.addEventListener("blur", clearInput)

register(GameScreen, "js-game-screen")
register(FpsMonitor, "js-fps-monitor")
register(VMonitor, "js-v-monitor")
register(KeyMonitor, "js-key-monitor")
register(SwipeHandler, "js-swipe-handler")
register(LoadingIndicator, "js-loading-indicator")
register(AppleCounter, "js-apple-counter")
register(ItemGetEffector, "js-item-get-effector")
register(ActorsCounter, "js-actors-counter")
