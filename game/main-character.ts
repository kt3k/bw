import { DIRS, DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import { loadImage } from "../util/load.ts"
import { Input, inputQueue } from "./ui/input.ts"
import { Character, Move, spawnCharacter } from "../model/character.ts"
import { splashColor } from "./field.ts"
import type { IField, MovePlan } from "../model/types.ts"
import * as signal from "../util/signal.ts"
import { bindToggleFullscreenOnce } from "../util/fullscreen.ts"
import { seed } from "../util/random.ts"

function colorCell(
  i: number,
  j: number,
  hue: number,
  sat: number,
  light: number,
  alpha: number,
  field: IField,
  rng: () => number,
): void {
  field.colorCell(
    i,
    j,
    `hsla(${hue}, ${sat}%, ${light}%, ${alpha + rng() * 0.15 - 0.05})`,
  )
}

export class MainCharacter extends Character {
  #lastMoveTypes: string[] = []
  override getNextMovePlan(_field: IField): MovePlan {
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
    return undefined
  }

  override onMoveEnd(field: IField, move: Move): void {
    const item = field.peekItem(this.i, this.j)
    if (item) {
      switch (item.type) {
        case "apple": {
          field.collectItem(this.i, this.j)
          for (const dir of DIRS) {
            if (dir === this.dir) continue
            if (!this.canGo(dir, field)) continue
            const actor = spawnCharacter(
              `${this.i}.${this.j}.inertial.${crypto.randomUUID()}`,
              "inertial",
              this.i,
              this.j,
              "char/lena/",
              { dir },
            )
            actor.loadAssets({ loadImage })
            actor.enqueueAction({ type: "go", dir })
            field.actors.add(actor)
          }

          const { rng } = seed(this.i + " " + this.j)
          const hue = 333.3
          const sat = 59.4
          const light = 32
          const alpha = 0.40
          splashColor(
            field,
            this.i,
            this.j,
            hue,
            sat,
            light,
            alpha,
            4,
            rng,
          )
          const count = signal.appleCount.get()
          signal.appleCount.update(count + 1)
          break
        }
        case "green-apple": {
          field.collectItem(this.i, this.j)

          const count = signal.greenAppleCount.get()
          signal.greenAppleCount.update(count + 1)
          for (const actor of field.actors.iter()) {
            if (actor === this) continue
            actor.onEvent({ type: "green-apple-collected" }, field)
          }
          break
        }
        case "mushroom": {
          field.collectItem(this.i, this.j)
          this.clearActionQueue()
          this.enqueueAction(
            { type: "jump" },
            { type: "speed", change: "2x" },
          )
          break
        }
        case "purple-mushroom": {
          field.collectItem(this.i, this.j)
          this.clearActionQueue()
          this.enqueueAction(
            { type: "jump" },
            { type: "speed", change: "4x" },
          )
          for (const _ of Array(30)) {
            this.enqueueAction({
              type: "splash",
              hue: 280,
              sat: 40,
              light: 30,
              alpha: 0.2,
              radius: 3,
            })
            this.enqueueAction({ type: "go", dir: this.dir })
          }
          this.enqueueAction(
            { type: "speed", change: "reset" },
            { type: "jump" },
          )
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
