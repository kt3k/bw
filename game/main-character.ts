import { DIRS, DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import { loadImage } from "../util/load.ts"
import { Input, inputQueue } from "./ui/input.ts"
import {
  Actor,
  ActorMove,
  type IdleDelegate,
  type MoveEndDelegate,
  spawnActor,
} from "../model/actor.ts"
import { splashColor } from "./field.ts"
import type { IField, MovePlan } from "../model/types.ts"
import * as signal from "../util/signal.ts"
import { bindToggleFullscreenOnce } from "../util/fullscreen.ts"
import { seed } from "../util/random.ts"

const lenaDef = {
  type: "inertial" as const,
  moveEnd: "inertial" as const,
  src: "../char/lena/",
  href: "/char/lena/",
}

export class IdleMainActor implements IdleDelegate {
  readonly type = "main"
  onIdle(_actor: Actor, _field: IField): MovePlan | undefined {
    if (Input.up) {
      return { type: "go", dir: UP }
    } else if (Input.down) {
      return { type: "go", dir: DOWN }
    } else if (Input.left) {
      return { type: "go", dir: LEFT }
    } else if (Input.right) {
      return { type: "go", dir: RIGHT }
    }

    const queueHead = inputQueue[0]

    if (
      queueHead === "space" ||
      queueHead === "touchendempty"
    ) {
      inputQueue.shift()
      return { type: "jump" }
    }
  }
}

export class MoveEndMainActor implements MoveEndDelegate {
  readonly type = "main"
  #lastMoveTypes: string[] = []

  onMoveEnd(actor: Actor, field: IField, move: ActorMove): void {
    const item = field.peekItem(actor.i, actor.j)
    if (item) {
      switch (item.type) {
        case "apple": {
          field.collectItem(actor.i, actor.j)
          for (const dir of DIRS) {
            if (dir === actor.dir) continue
            if (!actor.canGo(dir, field)) continue
            const actor_ = spawnActor(
              `${actor.i}.${actor.j}.inertial.${crypto.randomUUID()}`,
              actor.i,
              actor.j,
              lenaDef,
              { dir },
            )
            actor_.loadAssets({ loadImage })
            actor_.enqueueAction({ type: "go", dir })
            field.actors.add(actor_)
          }

          const hue = 333.3
          const sat = 59.4
          const light = 32
          const alpha = 0.40
          splashColor(
            field,
            actor.i,
            actor.j,
            hue,
            sat,
            light,
            alpha,
            4,
            seed(actor.i + " " + actor.j).rng,
          )
          const count = signal.appleCount.get()
          signal.appleCount.update(count + 1)
          break
        }
        case "green-apple": {
          field.collectItem(actor.i, actor.j)

          const hue = 113.1
          const sat = 40.4
          const light = 32
          const alpha = 0.40
          splashColor(
            field,
            actor.i,
            actor.j,
            hue,
            sat,
            light,
            alpha,
            4,
            seed(actor.i + " " + actor.j).rng,
          )

          const count = signal.greenAppleCount.get()
          signal.greenAppleCount.update(count + 1)
          break
        }
        case "mushroom": {
          field.collectItem(actor.i, actor.j)

          const hue = 21.3
          const sat = 40.4
          const light = 32
          const alpha = 0.40
          splashColor(
            field,
            actor.i,
            actor.j,
            hue,
            sat,
            light,
            alpha,
            4,
            seed(actor.i + " " + actor.j).rng,
          )

          actor.clearActionQueue()
          actor.enqueueAction(
            { type: "jump" },
            { type: "speed", change: "2x" },
          )
          break
        }
        case "purple-mushroom": {
          field.collectItem(actor.i, actor.j)
          actor.clearActionQueue()
          actor.enqueueAction(
            { type: "jump" },
            { type: "speed", change: "4x" },
          )
          const end = () => {
            actor.enqueueAction(
              { type: "speed", change: "reset" },
              { type: "jump" },
            )
          }
          for (const _ of Array(30)) {
            actor.enqueueAction({
              type: "splash",
              hue: 280,
              sat: 40,
              light: 30,
              alpha: 0.2,
              radius: 3,
            }, {
              type: "go",
              dir: actor.dir,
              cb: (move) => {
                if (move.type === "bounce") {
                  actor.clearActionQueue()
                  end()
                }
              },
            })
          }
          end()
          break
        }
      }
    }

    this.#lastMoveTypes.push(move.type)
    if (this.#lastMoveTypes.length > 3) {
      this.#lastMoveTypes.shift()
    }
    if (this.#lastMoveTypes.length === 3) {
      if (this.#lastMoveTypes.every((t) => t === "jump")) {
        bindToggleFullscreenOnce()
        this.#lastMoveTypes = []
      }
    }
  }
}
