import { DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import { Input, inputQueue } from "./ui/input.ts"
import {
  Character,
  CollisionChecker,
  IFieldTester,
  ItemContainer,
  NextState,
} from "../model/character.ts"
import * as signal from "../util/signal.ts"
import { bindToggleFullscreenOnce } from "../util/fullscreen.ts"

export class MainCharacter extends Character {
  #lastMoveTypes: ("linear" | "bounce")[] = []
  override getNextState(
    _fieldTester: IFieldTester,
    _collisionChecker: CollisionChecker,
  ): NextState {
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
    _fieldTester: IFieldTester,
    itemContainer: ItemContainer,
    moveType: "linear" | "bounce",
  ): void {
    const item = itemContainer.get(this.i, this.j)
    if (item) {
      switch (item.type) {
        case "apple": {
          itemContainer.remove(this.i, this.j)

          const count = signal.appleCount.get()
          signal.appleCount.update(count + 1)
          break
        }
        case "green-apple": {
          itemContainer.remove(this.i, this.j)

          const count = signal.greenAppleCount.get()
          signal.greenAppleCount.update(count + 1)
          break
        }
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
