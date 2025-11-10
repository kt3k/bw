import {
  DIRS,
  DOWN,
  LEFT,
  nextGrid,
  opposite,
  RIGHT,
  turnLeft,
  turnRight,
  UP,
} from "../util/dir.ts"
import { splashColor } from "../game/field.ts"
import { CELL_SIZE } from "../util/constants.ts"
import { seed } from "../util/random.ts"
import type {
  Action,
  Dir,
  FieldEvent,
  IActor,
  IField,
  LoadOptions,
  MovePlan,
} from "./types.ts"

const fallbackImagePhase0 = await fetch(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADdJREFUOE9jZMAE/9GEGNH4KPLokiC1Q9AAkpzMwMCA4m0QZxgYgJ4SSPLSaDqAJAqSAm3wJSQApTMgCUQZ7FoAAAAASUVORK5CYII=",
).then((res) => res.blob()).then((blob) => createImageBitmap(blob))

const fallbackImagePhase1 = await fetch(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAD5JREFUOE9jZGBg+M+AChjR+HjlQYqHgQFoXibNS+gBBjKMpDAZHAaQ5GQGBgYUV4+mA7QAgaYokgJ14NMBAK1TIAlUJpxYAAAAAElFTkSuQmCC",
).then((res) => res.blob()).then((blob) => createImageBitmap(blob))

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

export type NPCType =
  | typeof RandomlyTurnNPC.type
  | typeof RandomWalkNPC.type
  | typeof StaticNPC.type
  | typeof InertialNPC.type
  | typeof RandomRotateNPC.type

export function spawnCharacter(
  id: string,
  type: NPCType,
  i: number,
  j: number,
  src: string,
  { dir = "down", speed = 1 }: { dir?: Dir; speed?: 1 | 2 | 4 | 8 | 16 } = {},
): IActor {
  switch (type) {
    case RandomlyTurnNPC.type:
      return new RandomlyTurnNPC(i, j, src, id, dir, speed)
    case RandomWalkNPC.type:
      return new RandomWalkNPC(i, j, src, id, dir, speed)
    case StaticNPC.type:
      return new StaticNPC(i, j, src, id, dir, speed)
    case RandomRotateNPC.type:
      return new RandomRotateNPC(i, j, src, id, dir, speed)
    case InertialNPC.type:
      return new InertialNPC(i, j, src, id, dir, speed)
  }

  const _exhaustiveCheck: never = type
  throw new Error(`Unknown character type: ${type}`)
}

type MoveBase = {
  type: "move" | "bounce" | "jump"
  x: number
  y: number
  step(): void
  finished: boolean
  halfPassed: boolean
}

export type Move = CharacterGoMove | CharacterBounceMove | CharacterJumpMove

class CharacterGoMove implements MoveBase {
  #phase: number = 0
  #speed: number = 1
  #dir: Dir

  type = "move" as const

  constructor(speed: 1 | 2 | 4 | 8 | 16, dir: Dir) {
    this.#speed = speed
    this.#dir = dir
  }

  step() {
    this.#phase += this.#speed
  }

  get x(): number {
    if (this.#dir === LEFT) {
      return -this.#phase
    } else if (this.#dir === RIGHT) {
      return this.#phase
    }
    return 0
  }

  get y(): number {
    if (this.#dir === UP) {
      return -this.#phase
    } else if (this.#dir === DOWN) {
      return this.#phase
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

class CharacterBounceMove implements MoveBase {
  #phase: number = 0
  #dir: Dir
  #pushedActors: boolean
  #d = 0

  type = "bounce" as const

  constructor(dir: Dir, pushedActors: boolean) {
    this.#dir = dir
    this.#pushedActors = pushedActors
  }

  step() {
    this.#phase += 1
    if (this.#phase <= 8) {
      this.#d += 1
    } else {
      this.#d -= 1
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

class CharacterJumpMove implements MoveBase {
  #phase: number = 0
  #y: number = 0

  type = "jump" as const

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

/** The abstract character class
 * The parent class of MainCharacter and NPC.
 */
export abstract class Character implements IActor {
  /** The current direction of the character */
  #dir: Dir = "down"
  /** The column of the world coordinates */
  #i: number
  /** The row of the world coordinates */
  #j: number
  /** The id of the character */
  #id: string
  /** The speed of the move */
  #speed: 1 | 2 | 4 | 8 | 16 = 1
  /** The age after spawned in the field. Used for seeding RNG */
  #age = 0
  /** The counter of the idle state */
  #idleCounter: number = 0
  /** The time until the next action */
  #waitUntil: number | null = null
  /** The key of the physical grid, which is used for collision detection */
  #physicalGridKey: string
  /** The prefix of assets */
  #src: string
  /** The images necessary to render this character */
  #assets?: CharacterAssets
  /** The queue of actions to be performed */
  #actionQueue: Action[] = []
  /** The timer for speed up actions */
  #speedUpTimer: ReturnType<typeof setTimeout> | undefined
  /** The move of the character */
  #move: Move | null = null

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
  nextGrid(dir: Dir, distance = 1): [i: number, j: number] {
    return nextGrid(this.#i, this.#j, dir, distance)
  }

  /** Returns true if the character can go to the given direction */
  canGo(
    dir: Dir,
    field: IField,
  ): boolean {
    const [i, j] = this.nextGrid(dir)
    return field.canEnter(i, j)
  }

  /** Returns the next state of the character.
   * This method is called in each step.
   *
   * Returning the direction causes the character to move in that direction.
   * Returning undefined causes the character to stay in the current state.
   */
  getNextMovePlan(
    _field: IField,
  ): MovePlan {
    return undefined
  }

  onMoveEnd(
    _field: IField,
    _move: Move,
  ): void {}

  onMoveEndWrap(
    field: IField,
    move: Move,
  ) {
    this.#age++
    this.onMoveEnd(field, move)
  }

  enqueueAction(...actions: Action[]) {
    this.#actionQueue.push(...actions)
  }

  unshiftAction(...actions: Action[]) {
    this.#actionQueue.unshift(...actions)
  }

  clearActionQueue() {
    this.#actionQueue = []
  }

  get actionQueue(): readonly Action[] {
    return this.#actionQueue
  }

  #getNextMovePlanWrap(field: IField): MovePlan {
    if (this.#actionQueue.length > 0) {
      const nextAction = this.#actionQueue.shift()!
      if (nextAction.type === "speed") {
        clearTimeout(this.#speedUpTimer)
        switch (nextAction.change) {
          case "2x":
            this.speed = 2
            break
          case "4x":
            this.speed = 4
            break
          case "reset":
            this.speed = 1
            break
        }
        if (nextAction.change !== "reset") {
          this.#speedUpTimer = setTimeout(() => {
            this.#actionQueue.push(
              { type: "speed", change: "reset" },
              { type: "jump" },
            )
          }, 15000)
        }
        return this.#getNextMovePlanWrap(field)
      } else if (nextAction.type === "turn") {
        const dir = nextAction.dir
        switch (dir) {
          case "north":
            this.setDir("up")
            break
          case "south":
            this.setDir("down")
            break
          case "west":
            this.setDir("left")
            break
          case "east":
            this.setDir("right")
            break
          case "left":
            this.setDir(turnLeft(this.dir))
            break
          case "right":
            this.setDir(turnRight(this.dir))
            break
          case "back":
            this.setDir(opposite(this.dir))
            break
          default:
            dir satisfies never
        }
        return this.#getNextMovePlanWrap(field)
      } else if (nextAction.type === "wait") {
        if (field.time < nextAction.until) {
          this.#waitUntil = nextAction.until
          return undefined
        } else {
          return this.#getNextMovePlanWrap(field)
        }
      } else if (nextAction.type === "splash") {
        const { i, j } = this
        const { rng } = seed(`${i}${j}`)
        splashColor(
          field,
          i,
          j,
          nextAction.hue,
          nextAction.sat,
          nextAction.light,
          nextAction.alpha,
          nextAction.radius,
          rng,
        )
        return this.#getNextMovePlanWrap(field)
      }
      return nextAction
    }
    return this.getNextMovePlan(field)
  }

  step(field: IField) {
    if (this.#waitUntil === null && this.#move === null) {
      const nextPlan = this.#getNextMovePlanWrap(field)
      if (nextPlan) {
        this.#idleCounter = 0

        switch (nextPlan.type) {
          case "go":
          case "slide": {
            const dir = nextPlan.dir
            if (nextPlan?.type === "go") this.setDir(dir)
            if (this.canGo(dir, field)) {
              this.#move = new CharacterGoMove(this.#speed, dir)
            } else {
              const [i, j] = this.nextGrid(dir)
              const pushing = field.actors.get(i, j)
              pushing.forEach((actor) => {
                actor.onEvent(
                  { type: "bounced", dir, peakAt: 7 },
                  field,
                )
              })
              this.#move = new CharacterBounceMove(dir, pushing.length > 0)
            }
            break
          }
          case "jump":
            this.#move = new CharacterJumpMove()
            break
        }
      }
    }

    // check waitUntil against the field time
    if (this.#waitUntil !== null && field.time >= this.#waitUntil) {
      this.#waitUntil = null
    }

    if (this.#move) {
      this.#move.step()
      if (this.#move.finished) {
        if (this.#move.type === "move") {
          const dir = this.#move.dir
          const [nextI, nextJ] = this.nextGrid(dir)
          this.#i = nextI
          this.#j = nextJ
        }
        this.onMoveEnd(field, this.#move)
        this.#move = null
        this.#age++
      }
    } else {
      this.#idleCounter += 1
    }

    this.#physicalGridKey = this.#calcPhysicalGridKey()
  }

  image(): ImageBitmap {
    if (this.#move) {
      return this.getImage(this.#dir, this.#move.halfPassed ? 1 : 0)
    } else if (this.#idleCounter % 128 < 64) {
      // idle state
      return this.getImage(this.#dir, 0)
    } else {
      // active state
      return this.getImage(this.#dir, 1)
    }
  }

  get id(): string {
    return this.#id
  }

  get dir(): Dir {
    return this.#dir
  }

  /**
   * Gets the x of the world coordinates.
   *
   * This defines where the character is drawn.
   */
  get x(): number {
    return this.#i * CELL_SIZE + (this.#move ? this.#move.x : 0)
  }

  /**
   * Gets the center x of the world coordinates.
   *
   * This is used for setting the center of ViewScope.
   * We ignore the effect of jump and bounce to prevent screen shake.
   */
  get centerX(): number {
    if (
      this.#move && (this.#move.type === "jump" || this.#move.type === "bounce")
    ) {
      // We don't use #d in jump and bounce state to prevent screen shake
      return this.#i * CELL_SIZE + CELL_SIZE / 2
    }

    return this.x + CELL_SIZE / 2
  }

  /**
   * Gets the y of the world coordinates
   *
   * This defines where the character is drawn.
   */
  get y(): number {
    return this.#j * CELL_SIZE + (this.#move ? this.#move.y : 0)
  }

  /**
   * Gets the center y of the world coordinates.
   *
   * This is used for setting the center of ViewScope.
   * We ignore the effect of jump and bounce to prevent screen shake.
   */
  get centerY(): number {
    if (
      this.#move && (this.#move.type === "jump" || this.#move.type === "bounce")
    ) {
      // We don't use #d in jump and bounce state to prevent screen shake
      return this.#j * CELL_SIZE + CELL_SIZE / 2
    }

    return this.y + CELL_SIZE / 2
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

  /** Loads the assets and store ImageBitmaps in #assets. */
  async loadAssets(options: LoadOptions) {
    const loadImage = options.loadImage
    if (!loadImage) {
      throw new Error("Cannot load assets as loadImage not specified")
    }
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
    if (this.#move && this.#move.type === "move") {
      if (this.#move.dir === LEFT) {
        return this.#i - 1
      } else if (this.#move.dir === RIGHT) {
        return this.#i + 1
      }
    }
    return this.#i
  }

  get #physicalJ(): number {
    if (this.#move && this.#move.type === "move") {
      if (this.#move.dir === UP) {
        return this.#j - 1
      } else if (this.#move.dir === DOWN) {
        return this.#j + 1
      }
    }
    return this.#j
  }

  onEvent(event: FieldEvent, field: IField): void {
    switch (event.type) {
      case "green-apple-collected": {
        this.enqueueAction(
          { type: "turn", dir: "west" },
          { type: "wait", until: field.time + 4 },
          { type: "turn", dir: "south" },
          { type: "wait", until: field.time + 8 },
          { type: "turn", dir: "east" },
          { type: "wait", until: field.time + 12 },
          { type: "turn", dir: "north" },
          { type: "wait", until: field.time + 16 },
          { type: "turn", dir: "west" },
          { type: "wait", until: field.time + 20 },
          { type: "turn", dir: "south" },
          { type: "wait", until: field.time + 24 },
          { type: "turn", dir: "east" },
          { type: "wait", until: field.time + 28 },
          { type: "turn", dir: "north" },
          { type: "wait", until: field.time + 32 },
          { type: "turn", dir: "east" },
          { type: "slide", dir: "left" },
          { type: "turn", dir: "north" },
          { type: "slide", dir: "down" },
          { type: "turn", dir: "west" },
          { type: "slide", dir: "right" },
          { type: "turn", dir: "south" },
          { type: "slide", dir: "up" },
          { type: "turn", dir: "east" },
          { type: "slide", dir: "left" },
          { type: "turn", dir: "east" },
          { type: "turn", dir: "west" },
          { type: "jump" },
          { type: "turn", dir: "east" },
          { type: "jump" },
          { type: "turn", dir: "west" },
          { type: "jump" },
          { type: "turn", dir: "east" },
          { type: "jump" },
        )
        break
      }
      case "bounced": {
        if (this.#move) {
          this.unshiftAction({ type: "slide", dir: event.dir })
        } else {
          this.enqueueAction({ type: "wait", until: field.time + event.peakAt })
          this.enqueueAction({ type: "slide", dir: event.dir })
        }
        break
      }
    }
  }
}
export class RandomlyTurnNPC extends Character {
  static type = "random" as const

  #counter = 32
  override getNextMovePlan(field: IField): MovePlan {
    this.#counter -= 1
    if (this.#counter <= 0) {
      const { randomInt, choice } = seed(field.time.toString())
      this.#counter = randomInt(8) + 4
      // If the character can keep going in the current direction,
      // it will keep going with 96% probability.
      if (
        this.canGo(this.dir, field) &&
        Math.random() < 0.96
      ) {
        return { type: "go", dir: this.dir }
      }
      if (randomInt(2) === 0) {
        return { type: "jump" }
      }
      const nextCandidate = DIRS.filter((d) => this.canGo(d, field))
      if (nextCandidate.length === 0) {
        this.enqueueAction({
          type: "turn",
          dir: choice(["left", "right"]),
        })
        return undefined
      }
      return {
        type: "go",
        dir: choice(nextCandidate),
      }
    }
    return undefined
  }
}

export class RandomRotateNPC extends Character {
  static type = "random-rotate" as const

  #delay = 0
  #counter = 0
  #turnRight = true

  constructor(
    i: number,
    j: number,
    src: string,
    id: string,
    dir: Dir = DOWN,
    speed: 1 | 2 | 4 | 8 | 16 = 1,
  ) {
    super(i, j, src, id, dir, speed)
    const { randomInt } = seed(id)
    this.#delay = 43 + randomInt(8)
    this.#counter = this.#delay
    this.#turnRight = randomInt(2) === 0
  }

  override getNextMovePlan(_field: IField): MovePlan {
    this.#counter -= 1
    if (this.#counter > 0) {
      return
    }

    this.#counter = this.#delay
    if (this.#turnRight) {
      this.setDir(turnRight(this.dir))
    } else {
      this.setDir(turnLeft(this.dir))
    }
  }
}

export class RandomWalkNPC extends Character {
  static type = "random-walk" as const

  override getNextMovePlan(field: IField): MovePlan {
    const dirs = DIRS.filter((d) => {
      const [i, j] = this.nextGrid(d)
      return field.canEnterStatic(i, j)
    })
    if (dirs.length === 0) {
      return undefined
    }
    const { choice } = seed(
      this.age.toString() + this.i.toString() + this.j.toString(),
    )
    return { type: "go", dir: choice(dirs) }
  }
}

export class InertialNPC extends Character {
  static type = "inertial" as const

  override onMoveEnd(_field: IField, move: Move): void {
    if (this.actionQueue.length > 0) {
      return
    }

    switch (move.type) {
      case "move": {
        this.enqueueAction({ type: "go", dir: move.dir })
        break
      }
      case "bounce": {
        if (!move.pushedActors) {
          // The character was bounced to the wall.
          // In that case, the character go back to the opposite direction
          this.enqueueAction({ type: "go", dir: opposite(move.dir) })
        }
      }
    }
  }
}

export class StaticNPC extends Character {
  static type = "static" as const
}
