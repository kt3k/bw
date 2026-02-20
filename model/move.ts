import { DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import type { CommonMove, Dir, Move } from "./types.ts"

export class MoveGo implements CommonMove {
  #phase: number = 0
  #speed: number = 1
  #dir: Dir

  type = "move" as const
  cb?: (move: Move) => void

  constructor(speed: 1 | 2 | 4 | 8 | 16, dir: Dir) {
    this.#speed = speed
    this.#dir = dir
  }

  step() {
    this.#phase += this.#speed
  }

  get x(): number {
    if (this.#dir === LEFT) {
      return 16 - this.#phase
    } else if (this.#dir === RIGHT) {
      return this.#phase - 16
    }
    return 0
  }

  get y(): number {
    if (this.#dir === UP) {
      return 16 - this.#phase
    } else if (this.#dir === DOWN) {
      return this.#phase - 16
    }
    return 0
  }

  get finished(): boolean {
    return this.#phase >= 16
  }

  get dir(): Dir {
    return this.#dir
  }

  get halfPassed(): boolean {
    return this.#phase >= 8
  }
}

export class MoveBounce implements CommonMove {
  #phase: number = 0
  #dir: Dir
  #pushedActors: boolean
  #d = 0
  #speed: 1 | 2 | 4 | 8 | 16

  type = "bounce" as const
  cb?: (move: Move) => void

  constructor(dir: Dir, pushedActors: boolean, speed: 1 | 2 | 4 | 8 | 16) {
    this.#dir = dir
    this.#pushedActors = pushedActors
    this.#speed = speed
  }

  step() {
    this.#phase += this.#speed
    if (this.#phase <= 8) {
      this.#d += this.#speed
    } else {
      this.#d -= this.#speed
    }
  }

  get x(): number {
    if (this.#dir === LEFT) {
      return -this.#d
    } else if (this.#dir === RIGHT) {
      return this.#d
    }
    return 0
  }

  get y(): number {
    if (this.#dir === UP) {
      return -this.#d
    } else if (this.#dir === DOWN) {
      return this.#d
    }
    return 0
  }

  get finished(): boolean {
    return this.#phase >= 16
  }

  get pushedActors(): boolean {
    return this.#pushedActors
  }

  get dir(): Dir {
    return this.#dir
  }

  get halfPassed(): boolean {
    return this.#phase >= 8
  }
}

export class MoveJump implements CommonMove {
  #phase: number = 0
  #y: number = 0

  type = "jump" as const
  cb?: (move: Move) => void

  get x(): number {
    return 0
  }

  get y(): number {
    return this.#y
  }

  step() {
    this.#phase += 1
    if (this.#phase <= 2) {
      this.#y -= 6
    } else if (this.#phase <= 4) {
      this.#y -= 4
    } else if (this.#phase <= 6) {
      this.#y -= 2
    } else if (this.#phase <= 8) {
      this.#y -= 1
    } else if (this.#phase <= 10) {
      this.#y += 1
    } else if (this.#phase <= 12) {
      this.#y += 2
    } else if (this.#phase <= 14) {
      this.#y += 4
    } else {
      this.#y += 6
    }
  }

  get finished(): boolean {
    return this.#phase >= 16
  }

  get halfPassed(): boolean {
    return this.#phase >= 8
  }
}
