import { DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import { Input, inputQueue } from "./ui/input.ts"
import {
  Character,
  CollisionChecker,
  IFieldTester,
  ItemContainer,
  type MoveType,
  NextAction,
} from "../model/character.ts"
import * as signal from "../util/signal.ts"
import { bindToggleFullscreenOnce } from "../util/fullscreen.ts"

export class MainCharacter extends Character {
  #lastMoveTypes: MoveType[] = []
  #nextActionQueue: NextAction[] = []
  override getNextAction(
    _fieldTester: IFieldTester,
    _collisionChecker: CollisionChecker,
  ): NextAction {
    if (this.#nextActionQueue.length > 0) {
      return this.#nextActionQueue.shift()!
    }

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

  override onMoveEnd(
    fieldTester: IFieldTester,
    itemContainer: ItemContainer,
    moveType: MoveType,
  ): void {
    const item = itemContainer.get(this.i, this.j)
    if (item) {
      switch (item.type) {
        case "apple": {
          itemContainer.collect(this.i, this.j)

          const count = signal.appleCount.get()
          signal.appleCount.update(count + 1)
          break
        }
        case "green-apple": {
          itemContainer.collect(this.i, this.j)

          const count = signal.greenAppleCount.get()
          signal.greenAppleCount.update(count + 1)
          this.#nextActionQueue.push("jump")
          break
        }
      }
    }

    if (moveType === "linear") {
      const cell = fieldTester.get(this.i, this.j)
      if (cell.name === "d") {
        this.#nextActionQueue.push("jump")
      }
    }

    this.#lastMoveTypes.push(moveType)
    if (this.#lastMoveTypes.length > 4) {
      this.#lastMoveTypes.shift()
    }
    if (this.#lastMoveTypes.length === 4) {
      if (this.#lastMoveTypes.every((t) => t === "bounce")) {
        bindToggleFullscreenOnce()
        this.#lastMoveTypes = []
      }
    }
  }
}
