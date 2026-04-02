import { register } from "@kt3k/cell"
import { clearInput } from "./ui/input.ts"
import { KeyMonitor } from "./ui/key-monitor.ts"
import { FpsMonitor, VMonitor } from "./ui/fps-monitor.ts"
import {
  ActorsCounter,
  ItemsCounter,
  PropsCounter,
} from "./ui/spawns-counter.ts"
import { SwipeHandler } from "./ui/swipe-handler.ts"
import { ItemGetEffector } from "./ui/item-get-effector.ts"
import { LoadingIndicator } from "./ui/loading-indicator.ts"
import { AppleCounter } from "./ui/apple-counter.ts"
import { GameScreen } from "./game-screen.ts"
import { ExitButton } from "./ui/exit-button.ts"

import * as jsfxr from "jsfxr"
console.log("jsfxr", jsfxr)
;(globalThis as any).jsfxr = jsfxr
globalThis.addEventListener("blur", clearInput)

const preset = "pickupCoin"
const sound = jsfxr.sfxr.generate(preset)

document.addEventListener("click", () => {
  jsfxr.sfxr.play(sound)
})

register(GameScreen, "js-game-screen")
register(FpsMonitor, "js-fps-monitor")
register(VMonitor, "js-v-monitor")
register(KeyMonitor, "js-key-monitor")
register(SwipeHandler, "js-swipe-handler")
register(LoadingIndicator, "js-loading-indicator")
register(AppleCounter, "js-apple-counter")
register(ItemGetEffector, "js-item-get-effector")
register(ActorsCounter, "js-actors-counter")
register(ItemsCounter, "js-items-counter")
register(PropsCounter, "js-props-counter")
register(ExitButton, "js-exit-button")
