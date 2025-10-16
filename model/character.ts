import {
  DOWN,
  LEFT,
  opposite,
  RIGHT,
  turnLeft,
  turnRight,
  UP,
} from "../util/dir.ts"
import { CELL_SIZE } from "../util/constants.ts"
import { seed } from "../util/random.ts"
import type { ActorEvent, Dir, IActor, IField, LoadOptions } from "./types.ts"

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

// TODO: Move(move,bounce) / MovePlan(go,slide) / Action(MovePlan/effects)

export type MoveType = "go" | "bounce" | "jump"

export type Move =
  | { type: "go"; dir: Dir }
  | { type: "slide"; dir: Dir }
  | { type: "jump" }
  | undefined

export type Action =
  | Move
  | { type: "speed"; change: "2x" | "4x" | "reset" }
  | { type: "turn"; dir: "north" | "south" | "west" | "east" }
  | { type: "wait"; until: number }

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
  /** The time until the next action */
  #waitUntil: number | null = null
  /** Type of the move */
  #moveType: MoveType | undefined = undefined
  /** The direction of the move */
  #moveDir: Dir | undefined = undefined
  /** The characters currently this character is pushing */
  #pushing: IActor[] = []
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
    switch (dir) {
      case UP:
        return [this.#i, this.#j - 1]
      case DOWN:
        return [this.#i, this.#j + 1]
      case LEFT:
        return [this.#i - 1, this.#j]
      case RIGHT:
        return [this.#i + 1, this.#j]
    }
  }

  /** Returns true if the character can go to the given direction */
  canGo(
    dir: Dir | undefined,
    field: IField,
  ): boolean {
    const [i, j] = this.nextGrid(dir ?? this.dir)
    return field.canEnter(i, j)
  }

  /** Returns the next state of the character.
   * This method is called in each step.
   *
   * Returning the direction causes the character to move in that direction.
   * Returning undefined causes the character to stay in the current state.
   */
  getNextMove(
    _field: IField,
  ): Move {
    return undefined
  }

  onMoveEnd(
    _field: IField,
    _moveType: MoveType,
    _pushed: boolean,
  ): void {}

  onMoveEndWrap(
    field: IField,
    moveType: MoveType,
    pushed: boolean,
  ) {
    this.#age++
    this.onMoveEnd(field, moveType, pushed)
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

  #getNextMoveWrap(field: IField): Move {
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
        return this.#getNextMoveWrap(field)
      } else if (nextAction.type === "turn") {
        switch (nextAction.dir) {
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
        }
        return this.#getNextMoveWrap(field)
      } else if (nextAction.type === "wait") {
        if (field.time < nextAction.until) {
          this.#waitUntil = nextAction.until
          return undefined
        } else {
          return this.#getNextMoveWrap(field)
        }
      }
      return nextAction
    }
    return this.getNextMove(field)
  }

  step(field: IField) {
    if (this.#waitUntil === null && this.#movePhase === 0) {
      const nextMove = this.#getNextMoveWrap(field)
      switch (nextMove?.type) {
        case "go":
        case "slide":
          if (nextMove?.type === "go") this.setDir(nextMove.dir)
          this.#moveDir = nextMove.dir
          this.#idleCounter = 0
          this.#moveType = this.canGo(nextMove.dir, field) ? "go" : "bounce"
          break
        case "jump":
          this.#idleCounter = 0
          this.#moveType = "jump"
          break
      }
      if (this.#moveType === "bounce") {
        const [i, j] = this.nextGrid(this.moveDir!)
        this.#pushing = field.actors.get(i, j)
      } else {
        this.#pushing.length = 0
      }
    }

    if (this.#waitUntil !== null && field.time >= this.#waitUntil) {
      this.#waitUntil = null
    }

    if (this.#moveType === "go") {
      this.#movePhase += this.#speed
      this.#d += this.#speed
      if (this.#movePhase == 16) {
        switch (this.#moveDir) {
          case UP:
            this.#j -= 1
            break
          case DOWN:
            this.#j += 1
            break
          case LEFT:
            this.#i -= 1
            break
          case RIGHT:
            this.#i += 1
            break
        }
        this.#movePhase = 0
        const moveType = this.#moveType
        this.#moveType = undefined
        this.#d = 0
        this.onMoveEndWrap(field, moveType, this.#pushing.length > 0)
      }
    } else if (this.#moveType === "bounce") {
      this.#movePhase += this.#speed
      if (this.#movePhase < 8) {
        this.#d += this.#speed
      } else {
        this.#d -= this.#speed
      }
      if (this.#movePhase === 8) {
        this.#pushing.forEach((actor) => {
          actor.onEvent({ type: "bounced", dir: this.#moveDir! }, field)
        })
      } else if (this.#movePhase === 16) {
        this.#movePhase = 0
        const moveType = this.#moveType
        this.#moveType = undefined
        this.#d = 0
        this.onMoveEndWrap(field, moveType, this.#pushing.length > 0)
      }
    } else if (this.#moveType === "jump") {
      this.#movePhase += 1
      if (this.#movePhase <= 2) {
        this.#d += 6
      } else if (this.#movePhase <= 4) {
        this.#d += 4
      } else if (this.#movePhase <= 6) {
        this.#d += 2
      } else if (this.#movePhase <= 8) {
        this.#d += 1
      } else if (this.#movePhase <= 10) {
        this.#d -= 1
      } else if (this.#movePhase <= 12) {
        this.#d -= 2
      } else if (this.#movePhase <= 14) {
        this.#d -= 4
      } else {
        this.#d -= 6
      }
      if (this.#movePhase == 16) {
        this.#movePhase = 0
        const moveType = this.#moveType
        this.#moveType = undefined
        this.#d = 0
        this.onMoveEndWrap(field, moveType, this.#pushing.length > 0)
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

  get moveDir(): Dir | undefined {
    return this.#moveDir
  }

  /**
   * Gets the x of the world coordinates.
   *
   * This defines where the character is drawn.
   */
  get x(): number {
    if (this.#moveType === "jump") {
      // When jumping, the character always moves vertically
      return this.#i * CELL_SIZE
    }

    if (this.#moveDir === LEFT) {
      return this.#i * CELL_SIZE - this.#d
    } else if (this.#moveDir === RIGHT) {
      return this.#i * CELL_SIZE + this.#d
    } else {
      return this.#i * CELL_SIZE
    }
  }

  /**
   * Gets the center x of the world coordinates.
   *
   * This is used for setting the center of ViewScope.
   * We ignore the effect of jump and bounce to prevent screen shake.
   */
  get centerX(): number {
    if (this.#moveType === "jump" || this.#moveType === "bounce") {
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
    if (this.#moveType === "jump") {
      // When jumping, the character always moves vertically
      return this.#j * CELL_SIZE - this.#d
    }

    if (this.#moveDir === UP) {
      return this.#j * CELL_SIZE - this.#d
    } else if (this.#moveDir === DOWN) {
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

  /**
   * Gets the center y of the world coordinates.
   *
   * This is used for setting the center of ViewScope.
   * We ignore the effect of jump and bounce to prevent screen shake.
   */
  get centerY(): number {
    if (this.#moveType === "jump" || this.#moveType === "bounce") {
      // We don't use #d in jump and bounce state to prevent screen shake
      return this.#j * CELL_SIZE + CELL_SIZE / 2
    }

    return this.y + CELL_SIZE / 2
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
    if (this.#moveType === "go") {
      if (this.#moveDir === LEFT) {
        return this.#i - 1
      } else if (this.#moveDir === RIGHT) {
        return this.#i + 1
      }
    }
    return this.#i
  }

  get #physicalJ(): number {
    if (this.#moveType === "go") {
      if (this.#moveDir === UP) {
        return this.#j - 1
      } else if (this.#moveDir === DOWN) {
        return this.#j + 1
      }
    }
    return this.#j
  }

  onEvent(event: ActorEvent, field: IField): void {
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
        this.unshiftAction(
          { type: "slide", dir: event.dir },
        )
        break
      }
    }
  }
}

export class RandomlyTurnNPC extends Character {
  static type = "random" as const

  #counter = 32
  override getNextMove(field: IField): Move {
    this.#counter -= 1
    if (this.#counter <= 0) {
      const { randomInt, choice } = seed(this.age.toString())
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
      const nextCandidate = [UP, DOWN, LEFT, RIGHT] as Dir[]
      return {
        type: "go",
        dir: choice(nextCandidate.filter((d) => {
          return this.canGo(d, field)
        })),
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

  override getNextMove(_field: IField): Move {
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

  override getNextMove(field: IField): Move {
    const dirs = ([UP, DOWN, LEFT, RIGHT] as const).filter((d) => {
      return this.canGo(d, field)
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

  override onMoveEnd(field: IField, moveType: MoveType, pushed: boolean): void {
    const moveDir = this.moveDir ?? this.dir
    if (this.actionQueue.length > 0) {
      return
    }

    switch (moveType) {
      case "go": {
        this.enqueueAction({ type: "go", dir: moveDir })
        break
      }
      case "bounce": {
        if (!pushed) {
          this.enqueueAction({ type: "go", dir: opposite(moveDir) })
        }
      }
    }
  }
}

export class StaticNPC extends Character {
  static type = "static" as const
}
