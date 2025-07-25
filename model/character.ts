import { loadImage } from "../util/load.ts"
import { Input } from "../util/dir.ts"
import { type Dir, DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import { CELL_SIZE } from "../util/constants.ts"
import { choice, randomInt } from "../util/random.ts"
import * as signal from "../util/signal.ts"

export type ILoader = {
  loadAssets(): Promise<void>
  get assetsReady(): boolean
}

/** The interface represents a box */
export type IBox = {
  get x(): number
  get y(): number
  get w(): number
  get h(): number
}

export type IObj = IBox & ILoader & {
  i: number
  j: number
  image(): ImageBitmap
}

export type IFieldTester = {
  get(i: number, j: number): {
    canEnter(): boolean
  }
}

/** The implementor of 'step' function */
export type IStepper = {
  step(
    input: typeof Input,
    fieldTester: IFieldTester,
    collisionChecker: CollisionChecker,
    items: ItemContainer,
  ): void
}

/** The interface represents a character */
export type IChar =
  & IObj
  & IStepper
  & {
    get id(): string
    get physicalGridKey(): string
  }

type CharacterAppearance =
  | "up0"
  | "up1"
  | "down0"
  | "down1"
  | "left0"
  | "left1"
  | "right0"
  | "right1"

type CharacterAssets = {
  [K in CharacterAppearance]: ImageBitmap
}

export type CollisionChecker = (i: number, j: number) => boolean
export type ItemContainer = {
  get(i: number, j: number): IObj | undefined
  remove(i: number, j: number): void
}

/** The abstract character class
 * The parent class of MainCharacter and NPC.
 */
export abstract class Character implements IChar {
  /** The current direction of the character */
  #dir: Dir = "down"
  /** The column of the world coordinates */
  #i: number
  /** The row of the world coordinates */
  #j: number
  /** The id of the character */
  #id: string
  /** The distance of the current movement */
  #d: number = 0
  /** The speed of the move */
  #speed: 1 | 2 | 4 | 8 | 16 = 1
  /** True when moving, false otherwise */
  #isMoving: boolean = false
  /** The phase of the move */
  #movePhase: number = 0
  /** The counter of the idle state */
  #idleCounter: number = 0
  /** Type of the move */
  #moveType: "linear" | "bounce" = "linear"
  /** The key of the physical grid, which is used for collision detection */
  #physicalGridKey: string
  /** The prefix of assets */
  #assetPrefix: string
  /** The images necessary to render this character */
  #assets?: CharacterAssets

  /**
   * @param i The column of the grid coordinate
   * @param j The row of the grid coordinate
   * @param assetPrefix The prefix of the asset URL
   */
  constructor(
    i: number,
    j: number,
    assetPrefix: string,
    id: string,
    dir: Dir = DOWN,
    speed: 1 | 2 | 4 | 8 | 16 = 1,
  ) {
    this.#i = i
    this.#j = j
    this.#speed = speed
    this.#id = id
    this.#assetPrefix = assetPrefix
    this.#physicalGridKey = this.#calcPhysicalGridKey()
    this.#dir = dir
  }

  setState(state: Dir) {
    this.#dir = state
  }

  /** Returns the grid coordinates of the 1 cell front of the character. */
  frontCoord(): [i: number, j: number] {
    return this.nextCoord(this.#dir)
  }

  /** Returns the next grid coordinates of the 1 cell next of the character to the given direction */
  nextCoord(dir: Dir): [i: number, j: number] {
    if (dir === UP) {
      return [this.#i, this.#j - 1]
    } else if (dir === DOWN) {
      return [this.#i, this.#j + 1]
    } else if (dir === LEFT) {
      return [this.#i - 1, this.#j]
    } else {
      return [this.#i + 1, this.#j]
    }
  }

  /** Returns true if the character can go to the given direction */
  canEnter(
    dir: Dir,
    fieldTester: IFieldTester,
    collisionChecker: CollisionChecker,
  ): boolean {
    const [i, j] = this.nextCoord(dir)
    const cell = fieldTester.get(i, j)
    return cell.canEnter() && !collisionChecker(i, j)
  }

  /** Returns the next state of the character.
   * This method is called in each step.
   *
   * Returning the direction causes the character to move in that direction.
   * Returning undefined causes the character to stay in the current state.
   */
  getNextState(
    _input: typeof Input,
    _fieldTester: IFieldTester,
    _collisionChecker: CollisionChecker,
  ): Dir | undefined {
    return undefined
  }

  onMoveEnd(
    _fieldTester: IFieldTester,
    _itemContainer: ItemContainer,
    _moveType: "linear" | "bounce",
  ): void {}

  step(
    input: typeof Input,
    fieldTester: IFieldTester,
    collisionChecker: CollisionChecker,
    itemContainer: ItemContainer,
  ) {
    if (this.#movePhase === 0) {
      const nextState = this.getNextState(input, fieldTester, collisionChecker)
      if (nextState) {
        this.setState(nextState)
        this.#isMoving = true
        this.#idleCounter = 0

        if (this.canEnter(nextState, fieldTester, collisionChecker)) {
          this.#moveType = "linear"
        } else {
          this.#moveType = "bounce"
        }
      }
    }

    if (this.#isMoving) {
      if (this.#moveType === "linear") {
        this.#movePhase += this.#speed
        this.#d += this.#speed
        if (this.#movePhase == 16) {
          this.#movePhase = 0
          this.#isMoving = false
          this.#d = 0
          if (this.#dir === UP) {
            this.#j -= 1
          } else if (this.#dir === DOWN) {
            this.#j += 1
          } else if (this.#dir === LEFT) {
            this.#i -= 1
          } else if (this.#dir === RIGHT) {
            this.#i += 1
          }
          this.onMoveEnd(fieldTester, itemContainer, this.#moveType)
        }
      } else if (this.#moveType === "bounce") {
        this.#movePhase += this.#speed
        if (this.#movePhase < 8) {
          this.#d += this.#speed / 2
        } else {
          this.#d -= this.#speed / 2
        }
        if (this.#movePhase == 16) {
          this.#movePhase = 0
          this.#isMoving = false
          this.#d = 0
          this.onMoveEnd(fieldTester, itemContainer, this.#moveType)
        }
      }
    } else {
      this.#idleCounter += 1
    }

    this.#physicalGridKey = this.#calcPhysicalGridKey()
  }

  image(): ImageBitmap {
    if (this.#isMoving) {
      if (this.#movePhase < 8) {
        // idle state
        return this.#assets![`${this.#dir}0`]
      } else {
        // active state
        return this.#assets![`${this.#dir}1`]
      }
    } else {
      // idle stat
      if (this.#idleCounter % 128 < 64) {
        // idle state
        return this.#assets![`${this.#dir}0`]
      } else {
        // active state
        return this.#assets![`${this.#dir}1`]
      }
    }
  }

  get id(): string {
    return this.#id
  }

  get dir(): Dir {
    return this.#dir
  }

  /** Gets the x of the world coordinates */
  get x(): number {
    if (this.#dir === LEFT) {
      return this.#i * CELL_SIZE - this.#d
    } else if (this.#dir === RIGHT) {
      return this.#i * CELL_SIZE + this.#d
    } else {
      return this.#i * CELL_SIZE
    }
  }

  get centerX(): number {
    return this.x + CELL_SIZE / 2
  }

  /** Gets the y of the world coordinates */
  get y(): number {
    if (this.#dir === UP) {
      return this.#j * CELL_SIZE - this.#d
    } else if (this.#dir === DOWN) {
      return this.#j * CELL_SIZE + this.#d
    } else {
      return this.#j * CELL_SIZE
    }
  }

  get h(): number {
    return CELL_SIZE
  }

  get w(): number {
    return CELL_SIZE
  }

  get centerY(): number {
    return this.y + CELL_SIZE / 2
  }

  /**
   * Loads the assets and store resulted HTMLImageElement in the fields.
   * Assets are managed like this way to make garbage collection easier.
   */
  async loadAssets() {
    const [up0, up1, down0, down1, left0, left1, right0, right1] = await Promise
      .all([
        `${this.#assetPrefix}up0.png`,
        `${this.#assetPrefix}up1.png`,
        `${this.#assetPrefix}down0.png`,
        `${this.#assetPrefix}down1.png`,
        `${this.#assetPrefix}left0.png`,
        `${this.#assetPrefix}left1.png`,
        `${this.#assetPrefix}right0.png`,
        `${this.#assetPrefix}right1.png`,
      ].map(loadImage))
    this.#assets = {
      up0,
      up1,
      down0,
      down1,
      left0,
      left1,
      right0,
      right1,
    }
  }

  get assetsReady(): boolean {
    return !!this.#assets
  }

  #calcPhysicalGridKey(): string {
    return `${this.#physicalI}.${this.#physicalJ}`
  }

  get physicalGridKey(): string {
    return this.#physicalGridKey
  }

  get i(): number {
    return this.#i
  }
  get j(): number {
    return this.#j
  }

  /** Physical coordinate is the grid coordinate
   * where the character is currently located.
   * This is used to for collision detection with other characters.
   * Physical coordinate is different from display coordinate #i and #j
   * when the character is moving.
   */
  get #physicalI(): number {
    if (this.#isMoving && this.#moveType === "linear") {
      if (this.#dir === LEFT) {
        return this.#i - 1
      } else if (this.#dir === RIGHT) {
        return this.#i + 1
      }
    }
    return this.#i
  }

  get #physicalJ(): number {
    if (this.#isMoving && this.#moveType === "linear") {
      if (this.#dir === UP) {
        return this.#j - 1
      } else if (this.#dir === DOWN) {
        return this.#j + 1
      }
    }
    return this.#j
  }
}

export class MainCharacter extends Character {
  #lastMoveTypes: ("linear" | "bounce")[] = []
  override getNextState(
    input: typeof Input,
    _fieldTester: IFieldTester,
    _collisionChecker: CollisionChecker,
  ): Dir | undefined {
    if (input.up) {
      return UP
    } else if (input.down) {
      return DOWN
    } else if (input.left) {
      return LEFT
    } else if (input.right) {
      return RIGHT
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
      itemContainer.remove(this.i, this.j)
      const count = signal.appleCount.get()
      signal.appleCount.update(count + 1)
    }

    this.#lastMoveTypes.push(moveType)
    if (this.#lastMoveTypes.length > 4) {
      this.#lastMoveTypes.shift()
    }
    if (this.#lastMoveTypes.length === 4) {
      if (this.#lastMoveTypes.every((t) => t === "bounce")) {
        document.removeEventListener("keyup", toggleFullscreen)
        document.addEventListener("keyup", toggleFullscreen, { once: true })
        this.#lastMoveTypes = []
      }
    }
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

export class RandomWalkNPC extends Character {
  #counter = 32

  override getNextState(
    _input: typeof Input,
    fieldTester: IFieldTester,
    collisionChecker: CollisionChecker,
  ): Dir | undefined {
    this.#counter -= 1
    if (this.#counter <= 0) {
      this.#counter = randomInt(8) + 4
      // If the character can keep going in the current direction,
      // it will keep going with 80% probability.
      if (
        this.canEnter(this.dir, fieldTester, collisionChecker) &&
        Math.random() < 0.96
      ) {
        return this.dir
      }
      const nextCandidate = [UP, DOWN, LEFT, RIGHT] as Dir[]
      return choice(nextCandidate.filter((d) => {
        return this.canEnter(d, fieldTester, collisionChecker)
      }))
    }
    return undefined
  }
}

export class StaticNPC extends Character {
}
