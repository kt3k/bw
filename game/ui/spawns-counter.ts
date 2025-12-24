import type { Context } from "@kt3k/cell"
import * as signal from "../../util/signal.ts"

/** The ui which shows the current actors count */
export function ActorsCounter({ el, subscribe }: Context) {
  subscribe(signal.actorsCount, (count) => {
    el.textContent = count.toString()
  })
}

/** The ui which shows the current active items count */
export function ItemsCounter({ el, subscribe }: Context) {
  subscribe(signal.itemsCount, (count) => {
    el.textContent = count.toString()
  })
}

/** The ui which shows the current active props count */
export function PropsCounter({ el, subscribe }: Context) {
  subscribe(signal.propsCount, (count) => {
    el.textContent = count.toString()
  })
}
