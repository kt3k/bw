import { loadImage } from "../util/load.ts"
import { type Dir, DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import { CELL_SIZE } from "../util/constants.ts"
import { seed } from "../util/random.ts"

const fallbackImagePhase0 = await fetch(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADdJREFUOE9jZMAE/9GEGNH4KPLokiC1Q9AAkpzMwMCA4m0QZxgYgJ4SSPLSaDqAJAqSAm3wJSQApTMgCUQZ7FoAAAAASUVORK5CYII=",
).then((res) => res.blob()).then((blob) => createImageBitmap(blob))

const fallbackImagePhase1 = await fetch(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAD5JREFUOE9jZGBg+M+AChjR+HjlQYqHgQFoXibNS+gBBjKMpDAZHAaQ5GQGBgYUV4+mA7QAgaYokgJ14NMBAK1TIAlUJpxYAAAAAElFTkSuQmCC",
).then((res) => res.blob()).then((blob) => createImageBitmap(blob))

export type ILoader = {
  loadAssets(): Promise<void>
  get assetsReady(): boolean
}

export type CellName = "0" | "1" | "2" | "d"

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

export type ItemType = "apple" | "green-apple" | "mushroom"

export type IItem = IObj & {
  id: string | null
  type: ItemType
}

export type IFieldTester = {
  get(i: number, j: number): {
    canEnter: boolean
    get name(): CellName
  }
}

/** The implementor of 'step' function */
export type IStepper = {
  step(
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
  get(i: number, j: number): IItem | undefined
  collect(i: number, j: number): void
}

export type NPCType = "random" | "random-walk" | "static"

export function spawnCharacter(
  id: string,
  type: NPCType,
  i: number,
  j: number,
  src: string,
  { dir = "down", speed = 1 }: { dir?: Dir; speed?: 1 | 2 | 4 | 8 | 16 } = {},
): IChar {
  if (type === "random") {
    return new RandomlyTurnNPC(i, j, src, id, dir, speed)
  } else if (type === "random-walk") {
    return new RandomWalkNPC(i, j, src, id, dir, speed)
  } else if (type === "static") {
    return new StaticNPC(i, j, src, id, dir, speed)
  }
  throw new Error(`Unknown character type: ${type}`)
}

export type MoveType = "linear" | "bounce" | "jump"

export type NextAction = Dir | "jump" | undefined

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
  /** The age after spawned in the field. Used for seeding RNG */
  #age = 0
  /** The phase of the move */
  #movePhase: number = 0
  /** The counter of the idle state */
  #idleCounter: number = 0
  /** Type of the move */
  #moveType: MoveType | undefined = undefined
  /** The key of the physical grid, which is used for collision detection */
  #physicalGridKey: string
  /** The prefix of assets */
  #src: string
  /** The images necessary to render this character */
  #assets?: CharacterAssets

  constructor(
    i: number,
    j: number,
    src: string,
    id: string,
    dir: Dir = DOWN,
    speed: 1 | 2 | 4 | 8 | 16 = 1,
  ) {
    this.#i = i
    this.#j = j
    this.#speed = speed
    this.#id = id
    this.#src = src
    this.#physicalGridKey = this.#calcPhysicalGridKey()
    this.#dir = dir
  }

  setDir(state: Dir) {
    this.#dir = state
  }

  /** Returns the grid coordinates of the 1 cell front of the character. */
  frontGrid(): [i: number, j: number] {
    return this.nextGrid(this.#dir)
  }

  /** Returns the next grid coordinates of the 1 cell next of the character to the given direction */
  nextGrid(dir: Dir): [i: number, j: number] {
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
    const [i, j] = this.nextGrid(dir)
    const cell = fieldTester.get(i, j)
    return cell.canEnter && !collisionChecker(i, j)
  }

  /** Returns the next state of the character.
   * This method is called in each step.
   *
   * Returning the direction causes the character to move in that direction.
   * Returning undefined causes the character to stay in the current state.
   */
  getNextAction(
    _fieldTester: IFieldTester,
    _collisionChecker: CollisionChecker,
  ): NextAction {
    return undefined
  }

  onMoveEnd(
    _fieldTester: IFieldTester,
    _itemContainer: ItemContainer,
    _moveType: MoveType,
  ): void {}

  onMoveEndWrap(
    fieldTester: IFieldTester,
    itemContainer: ItemContainer,
    moveType: MoveType,
  ) {
    this.#age++
    this.onMoveEnd(fieldTester, itemContainer, moveType)
  }

  step(
    fieldTester: IFieldTester,
    collisionChecker: CollisionChecker,
    itemContainer: ItemContainer,
  ) {
    if (this.#movePhase === 0) {
      const nextState = this.getNextAction(fieldTester, collisionChecker)
      if (
        nextState === "up" || nextState === "down" ||
        nextState === "left" || nextState === "right"
      ) {
        this.setDir(nextState)
        this.#idleCounter = 0

        if (this.canEnter(nextState, fieldTester, collisionChecker)) {
          this.#moveType = "linear"
        } else {
          this.#moveType = "bounce"
        }
      } else if (nextState === "jump") {
        this.#idleCounter = 0
        this.#moveType = "jump"
        // Jumping is always allowed.
      }
    }

    if (this.#moveType === "linear") {
      this.#movePhase += this.#speed
      this.#d += this.#speed
      if (this.#movePhase == 16) {
        if (this.#dir === UP) {
          this.#j -= 1
        } else if (this.#dir === DOWN) {
          this.#j += 1
        } else if (this.#dir === LEFT) {
          this.#i -= 1
        } else if (this.#dir === RIGHT) {
          this.#i += 1
        }
        this.#movePhase = 0
        const moveType = this.#moveType
        this.#moveType = undefined
        this.#d = 0
        this.onMoveEndWrap(fieldTester, itemContainer, moveType)
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
        const moveType = this.#moveType
        this.#moveType = undefined
        this.#d = 0
        this.onMoveEndWrap(fieldTester, itemContainer, moveType)
      }
    } else if (this.#moveType === "jump") {
      this.#movePhase += this.#speed * 2
      if (this.#movePhase < 8) {
        this.#d += this.#speed * 2
      } else {
        this.#d -= this.#speed * 2
      }
      if (this.#movePhase == 16) {
        this.#movePhase = 0
        const moveType = this.#moveType
        this.#moveType = undefined
        this.#d = 0
        this.onMoveEndWrap(fieldTester, itemContainer, moveType)
      }
    } else {
      this.#idleCounter += 1
    }

    this.#physicalGridKey = this.#calcPhysicalGridKey()
  }

  image(): ImageBitmap {
    if (this.#moveType !== undefined) {
      if (this.#movePhase < 8) {
        return this.getImage(this.#dir, 0)
      } else {
        // active state
        return this.getImage(this.#dir, 1)
      }
    } else {
      // idle state
      if (this.#idleCounter % 128 < 64) {
        // idle state
        return this.getImage(this.#dir, 0)
      } else {
        // active state
        return this.getImage(this.#dir, 1)
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
    if (this.#moveType === "jump") {
      // When jumping, the character always moves vertically
      return this.#i * CELL_SIZE
    }

    if (this.#dir === LEFT) {
      return this.#i * CELL_SIZE - this.#d
    } else if (this.#dir === RIGHT) {
      return this.#i * CELL_SIZE + this.#d
    } else {
      return this.#i * CELL_SIZE
    }
  }

  /** Gets the center x of the world coordinates. This is used for setting the center of ViewScope. */
  get centerX(): number {
    return this.x + CELL_SIZE / 2
  }

  /** Gets the y of the world coordinates */
  get y(): number {
    if (this.#moveType === "jump") {
      // When jumping, the character always moves vertically
      return this.#j * CELL_SIZE - this.#d
    }

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

  set speed(value: 1 | 2 | 4 | 8 | 16) {
    this.#speed = value
  }

  /** Gets the center y of the world coordinates. This is used for setting the center of ViewScope. */
  get centerY(): number {
    if (this.#moveType === "jump") {
      // We don't use #d in jump state. Otherwise the screen shakes for each jump.
      return this.#j * CELL_SIZE + CELL_SIZE / 2
    }

    return this.y + CELL_SIZE / 2
  }

  /** Loads the assets and store ImageBitmaps in #assets. */
  async loadAssets() {
    const [up0, up1, down0, down1, left0, left1, right0, right1] = await Promise
      .all([
        `${this.#src}up0.png`,
        `${this.#src}up1.png`,
        `${this.#src}down0.png`,
        `${this.#src}down1.png`,
        `${this.#src}left0.png`,
        `${this.#src}left1.png`,
        `${this.#src}right0.png`,
        `${this.#src}right1.png`,
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

  getImage(dir: Dir, phase: 0 | 1): ImageBitmap {
    if (!this.#assets) {
      if (phase === 0) {
        return fallbackImagePhase0
      } else {
        return fallbackImagePhase1
      }
    }
    return this.#assets[`${dir}${phase}`]
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

  get age(): number {
    return this.#age
  }

  /** Physical coordinate is the grid coordinate
   * where the character is currently located.
   * This is used to for collision detection with other characters.
   * Physical coordinate is different from display coordinate #i and #j
   * when the character is moving.
   */
  get #physicalI(): number {
    if (this.#moveType === "linear") {
      if (this.#dir === LEFT) {
        return this.#i - 1
      } else if (this.#dir === RIGHT) {
        return this.#i + 1
      }
    }
    return this.#i
  }

  get #physicalJ(): number {
    if (this.#moveType === "linear") {
      if (this.#dir === UP) {
        return this.#j - 1
      } else if (this.#dir === DOWN) {
        return this.#j + 1
      }
    }
    return this.#j
  }
}

export class RandomlyTurnNPC extends Character {
  #counter = 32

  override getNextAction(
    fieldTester: IFieldTester,
    collisionChecker: CollisionChecker,
  ): NextAction {
    this.#counter -= 1
    if (this.#counter <= 0) {
      const { randomInt, choice } = seed(this.age.toString())
      this.#counter = randomInt(8) + 4
      // If the character can keep going in the current direction,
      // it will keep going with 96% probability.
      if (
        this.canEnter(this.dir, fieldTester, collisionChecker) &&
        Math.random() < 0.96
      ) {
        return this.dir
      }
      if (randomInt(2) === 0) {
        return "jump"
      }
      const nextCandidate = [UP, DOWN, LEFT, RIGHT] as Dir[]
      return choice(nextCandidate.filter((d) => {
        return this.canEnter(d, fieldTester, collisionChecker)
      }))
    }
    return undefined
  }
}

export class RandomWalkNPC extends Character {
  override getNextAction(
    fieldTester: IFieldTester,
    collisionChecker: CollisionChecker,
  ): NextAction {
    const dirs = ([UP, DOWN, LEFT, RIGHT] as const).filter((d) => {
      return this.canEnter(d, fieldTester, collisionChecker)
    })
    if (dirs.length === 0) {
      return undefined
    }
    const { choice } = seed(this.age.toString())
    return choice(dirs)
  }
}

export class StaticNPC extends Character {
}
