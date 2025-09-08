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
import { seed } from "../util/random.ts"

export class MainCharacter extends Character {
  #lastMoveTypes: MoveType[] = []
  #nextActionQueue: (NextAction | "speed-2x" | "speed-4x" | "speed-reset")[] =
    []
  #speedUpTimer: number | undefined = undefined
  override getNextAction(
    fieldTester: IFieldTester,
    collisionChecker: CollisionChecker,
  ): NextAction {
    if (this.#nextActionQueue.length > 0) {
      const nextAction = this.#nextActionQueue.shift()!
      if (nextAction === "speed-2x") {
        this.speed = 2
        this.#speedUpTimer = setTimeout(() => {
          this.#nextActionQueue.push("speed-reset", "jump")
        }, 15000)
        return this.getNextAction(fieldTester, collisionChecker)
      } else if (nextAction === "speed-4x") {
        this.speed = 4
        this.#speedUpTimer = setTimeout(() => {
          this.#nextActionQueue.push("speed-reset", "jump")
        }, 15000)
        return this.getNextAction(fieldTester, collisionChecker)
      } else if (nextAction === "speed-reset") {
        if (this.#speedUpTimer) {
          clearTimeout(this.#speedUpTimer)
          this.#speedUpTimer = undefined
        }
        this.speed = 1
        return this.getNextAction(fieldTester, collisionChecker)
      }
      return nextAction
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
          break
        }
        case "mushroom": {
          itemContainer.collect(this.i, this.j)
          this.#nextActionQueue = []
          this.#nextActionQueue.push("speed-reset", "jump", "speed-2x")
          break
        }
        case "purple-mushroom": {
          itemContainer.collect(this.i, this.j)
          const { choice } = seed(`${this.i},${this.j}`)
          this.#nextActionQueue = []
          this.#nextActionQueue.push("speed-reset", "jump", "jump", "speed-4x")
          for (const _ of Array(30)) {
            this.#nextActionQueue.push(choice([UP, DOWN, LEFT, RIGHT]))
          }
          this.#nextActionQueue.push("speed-reset", "jump")
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
