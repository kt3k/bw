import { DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import { Input, inputQueue } from "./ui/input.ts"
import { Character, Move, type MoveType } from "../model/character.ts"
import type { IField } from "../model/types.ts"
import * as signal from "../util/signal.ts"
import { bindToggleFullscreenOnce } from "../util/fullscreen.ts"

export class MainCharacter extends Character {
  #lastMoveTypes: MoveType[] = []
  override getNextMove(_field: IField): Move {
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
