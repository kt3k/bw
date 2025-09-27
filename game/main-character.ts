import { DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import { Input, inputQueue } from "./ui/input.ts"
import { Action, Character, type MoveType } from "../model/character.ts"
import type { IField } from "../model/types.ts"
import * as signal from "../util/signal.ts"
import { bindToggleFullscreenOnce } from "../util/fullscreen.ts"
import { seed } from "../util/random.ts"

export class MainCharacter extends Character {
  #lastMoveTypes: MoveType[] = []
  override getNextAction(_field: IField): Action {
    if (Input.up) {
      return UP
    } else if (Input.down) {
      return DOWN
    } else if (Input.left) {
      return LEFT
    } else if (Input.right) {
      return RIGHT
    }

    const queueHead = inputQueue[0]

    if (
      queueHead === "space" ||
      queueHead === "touchendempty"
    ) {
      inputQueue.shift()
      return "jump"
    }
    return undefined
  }

  override onMoveEnd(field: IField, moveType: MoveType): void {
    const item = field.peekItem(this.i, this.j)
    if (item) {
      switch (item.type) {
        case "apple": {
          field.collectItem(this.i, this.j)

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
            actor.onEvent({ type: "green-apple-collected" })
          }
          break
        }
        case "mushroom": {
          field.collectItem(this.i, this.j)
          this.clearActionQueue()
          this.enqueueAction("speed-reset", "jump", "speed-2x")
          break
        }
        case "purple-mushroom": {
          field.collectItem(this.i, this.j)
          const { choice } = seed(`${this.i},${this.j}`)
          this.clearActionQueue
          this.enqueueAction("speed-reset", "jump", "jump", "speed-4x")
          for (const _ of Array(30)) {
            this.enqueueAction(choice([this.dir]))
          }
          this.enqueueAction("speed-reset", "jump")
          break
        }
      }
    }

    this.#lastMoveTypes.push(moveType)
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
