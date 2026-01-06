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
  IActor,
  IField,
  LoadOptions,
  Move,
  MovePlan,
} from "./types.ts"
import { ActorDefinition } from "./catalog.ts"

const fallbackImagePhase0 = await fetch(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADdJREFUOE9jZMAE/9GEGNH4KPLokiC1Q9AAkpzMwMCA4m0QZxgYgJ4SSPLSaDqAJAqSAm3wJSQApTMgCUQZ7FoAAAAASUVORK5CYII=",
).then((res) => res.blob()).then((blob) => createImageBitmap(blob))

const fallbackImagePhase1 = await fetch(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAD5JREFUOE9jZGBg+M+AChjR+HjlQYqHgQFoXibNS+gBBjKMpDAZHAaQ5GQGBgYUV4+mA7QAgaYokgJ14NMBAK1TIAlUJpxYAAAAAElFTkSuQmCC",
).then((res) => res.blob()).then((blob) => createImageBitmap(blob))

type ActorAppearance =
  | "up0"
  | "up1"
  | "down0"
  | "down1"
  | "left0"
  | "left1"
  | "right0"
  | "right1"

type ActorAssets = {
  [K in ActorAppearance]: ImageBitmap
}

export type MoveEndType = "inertial"
export type IdleType = "random-rotate" | "random-walk" | "wander"

export type PushedEvent = {
  type: "pushed"
  dir: Dir
  peakAt: number
}

export function spawnActor(
  id: string,
  i: number,
  j: number,
  def: ActorDefinition,
  { dir = "down", speed = 1 }: { dir?: Dir; speed?: 1 | 2 | 4 | 8 | 16 } = {},
): IActor {
  let moveEnd: MoveEndDelegate | null = null
  let idle: IdleDelegate | null = null
  switch (def.moveEnd) {
    case "inertial":
      moveEnd = new MoveEndInertial()
      break
  }
  switch (def.idle) {
    case "random-rotate":
      idle = new IdleRandomRotate()
      break
    case "random-walk":
      idle = new IdleRandomWalk()
      break
    case "wander":
      idle = new IdleWander()
      break
  }
  return new Actor(i, j, def, id, dir, speed, moveEnd, idle)
}

export type ActorMove = ActorGoMove | ActorBounceMove | ActorJumpMove

export class ActorGoMove implements Move {
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

export class ActorBounceMove implements Move {
  #phase: number = 0
  #dir: Dir
  #pushedActors: boolean
  #d = 0
  #speed: 1 | 2 | 4 | 8 | 16

  type = "bounce" as const

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

export class ActorJumpMove implements Move {
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

/** The abstract actor class
 * The parent class of {@code MainCharacter} and NPC.
 */
export class Actor implements IActor {
  /** The current direction of the actor */
  #dir: Dir = "down"
  /** The column of the world coordinates */
  #i: number
  /** The row of the world coordinates */
  #j: number
  /** The id of the actor */
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
  #def: ActorDefinition
  /** The images necessary to render this actor */
  #assets?: ActorAssets
  /** The queue of actions to be performed */
  #actionQueue: Action[] = []
  /** The timer for speed up actions */
  #speedUpTimer: ReturnType<typeof setTimeout> | undefined
  /** The move of the actor */
  #move: ActorMove | null = null
  /** The move plan */
  #movePlan: MovePlan | null = null
  /** MoveEnd delegate */
  #moveEnd: MoveEndDelegate | null
  /** Idle delegate */
  #idle: IdleDelegate | null

  constructor(
    i: number,
    j: number,
    def: ActorDefinition,
    id: string,
    dir: Dir = DOWN,
    speed: 1 | 2 | 4 | 8 | 16 = 1,
    moveEnd: MoveEndDelegate | null = null,
    idle: IdleDelegate | null = null,
  ) {
    this.#i = i
    this.#j = j
    this.#speed = speed
    this.#id = id
    this.#def = def
    this.#physicalGridKey = this.#calcPhysicalGridKey()
    this.#dir = dir
    this.#moveEnd = moveEnd
    this.#idle = idle
  }

  setDir(state: Dir) {
    this.#dir = state
  }

  /** Returns the grid coordinates of the 1 cell front of the actor. */
  frontGrid(): [i: number, j: number] {
    return this.nextGrid(this.#dir)
  }

  /** Returns the next grid coordinates of the 1 cell next of the actor to the given direction */
  nextGrid(dir: Dir, distance = 1): [i: number, j: number] {
    return nextGrid(this.#i, this.#j, dir, distance)
  }

  /** Returns true if the actor can go to the given direction */
  canGo(
    dir: Dir,
    field: IField,
  ): boolean {
    const [i, j] = this.nextGrid(dir)
    return field.canEnter(i, j)
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

  #processActionQueue(field: IField): MovePlan | undefined | "idle" {
    const action = this.#actionQueue.shift()
    if (!action) {
      return "idle"
    }
    switch (action.type) {
      case "speed": {
        clearTimeout(this.#speedUpTimer)
        switch (action.change) {
          case "2x":
            this.speed = 2
            break
          case "4x":
            this.speed = 4
            break
          case "reset":
            this.speed = 1
            break
          default:
            action.change satisfies never
        }
        if (action.change !== "reset") {
          this.#speedUpTimer = setTimeout(() => {
            this.#actionQueue.push(
              { type: "speed", change: "reset" },
              { type: "jump" },
            )
          }, 15000)
        }
        return this.#processActionQueue(field)
      }
      case "turn": {
        const dir = action.dir
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
        return this.#processActionQueue(field)
      }
      case "wait": {
        if (field.time < action.until) {
          this.#waitUntil = action.until
          return undefined
        }
        return this.#processActionQueue(field)
      }
      case "splash": {
        const { i, j } = this
        const { rng } = seed(`${i}${j}`)
        splashColor(
          field,
          i,
          j,
          action.hue,
          action.sat,
          action.light,
          action.alpha,
          action.radius,
          rng,
        )
        return this.#processActionQueue(field)
      }
      case "go-random": {
        const { choice } = seed(`${this.i}.${this.j}`)
        return { type: "go", dir: choice(DIRS) }
      }
    }

    action satisfies MovePlan
    return action
  }

  step(field: IField) {
    if (this.#waitUntil === null && this.#move === null) {
      let nextPlan = this.#processActionQueue(field)
      if (nextPlan === "idle") {
        nextPlan = this.#idle?.onIdle(this, field)
      }
      if (nextPlan) {
        this.#movePlan = nextPlan
        this.#idleCounter = 0

        switch (nextPlan.type) {
          case "go":
          case "slide": {
            const dir = nextPlan.dir
            if (nextPlan?.type === "go") this.setDir(dir)
            if (this.canGo(dir, field)) {
              this.#move = new ActorGoMove(this.#speed, dir)
              const [nextI, nextJ] = this.nextGrid(dir)
              this.#i = nextI
              this.#j = nextJ
            } else {
              const [i, j] = this.nextGrid(dir)
              const ev = { type: "pushed", dir, peakAt: 7 } as const
              let actorPushed = false
              for (const actor of field.actors.get(i, j)) {
                actorPushed = true
                actor.onPushed(ev, field)
              }
              field.props.get(i, j)?.onPushed(ev, field)
              this.#move = new ActorBounceMove(
                dir,
                actorPushed,
                this.#speed,
              )
            }
            break
          }
          case "jump":
            this.#move = new ActorJumpMove()
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
        this.#movePlan?.cb?.(this.#move)
        this.#moveEnd?.onMoveEnd(this, field, this.#move)
        this.#move = null
        this.#movePlan = null
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
   * This defines where the actor is drawn.
   */
  get x(): number {
    return this.#i * CELL_SIZE + (this.#move?.x ?? 0)
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
   * This defines where the actor is drawn.
   */
  get y(): number {
    return this.#j * CELL_SIZE + (this.#move?.y ?? 0)
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
        `${this.#def.href}up0.png`,
        `${this.#def.href}up1.png`,
        `${this.#def.href}down0.png`,
        `${this.#def.href}down1.png`,
        `${this.#def.href}left0.png`,
        `${this.#def.href}left1.png`,
        `${this.#def.href}right0.png`,
        `${this.#def.href}right1.png`,
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
    return `${this.#i}.${this.#j}`
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

  onPushed(event: PushedEvent, field: IField): void {
    splashColor(
      field,
      this.i,
      this.j,
      120,
      30,
      0,
      0.001,
      2,
      seed(this.#physicalGridKey).rng,
    )
    if (this.#move) {
      this.unshiftAction({ type: "slide", dir: event.dir })
    } else {
      this.enqueueAction({ type: "wait", until: field.time + event.peakAt })
      this.enqueueAction({ type: "slide", dir: event.dir })
    }
  }
}

export interface MoveEndDelegate {
  onMoveEnd(actor: Actor, field: IField, move: ActorMove): void
}

export class MoveEndInertial implements MoveEndDelegate {
  onMoveEnd(actor: Actor, _field: IField, move: ActorMove): void {
    if (actor.actionQueue.length > 0) {
      return
    }

    switch (move.type) {
      case "move": {
        actor.enqueueAction({ type: "go", dir: move.dir })
        break
      }
      case "bounce": {
        if (!move.pushedActors) {
          // The actor was bounced to the wall.
          // In that case, the actor go back to the opposite direction
          actor.enqueueAction({ type: "go", dir: opposite(move.dir) })
        }
      }
    }
  }
}

export interface IdleDelegate {
  onIdle(actor: Actor, field: IField): MovePlan | undefined
}

export class IdleRandomWalk implements IdleDelegate {
  onIdle(actor: Actor, field: IField): MovePlan | undefined {
    const dirs = DIRS.filter((d) => {
      const [i, j] = actor.nextGrid(d)
      return field.canEnterStatic(i, j)
    })
    if (dirs.length === 0) {
      return undefined
    }
    const { choice } = seed(
      actor.age.toString() + actor.i.toString() + actor.j.toString(),
    )
    return { type: "go", dir: choice(dirs) }
  }
}

export class IdleWander implements IdleDelegate {
  #counter = 32
  onIdle(actor: Actor, field: IField): MovePlan | undefined {
    this.#counter -= 1
    if (this.#counter <= 0) {
      const { randomInt, choice } = seed(field.time.toString())
      this.#counter = randomInt(8) + 4
      // If the actor can keep going in the current direction,
      // it will keep going with 96% probability.
      if (
        actor.canGo(actor.dir, field) &&
        Math.random() < 0.96
      ) {
        return { type: "go", dir: actor.dir }
      }
      if (randomInt(2) === 0) {
        return { type: "jump" }
      }
      const nextCandidate = DIRS.filter((d) => actor.canGo(d, field))
      if (nextCandidate.length === 0) {
        actor.enqueueAction({
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
  }
}

export class IdleRandomRotate implements IdleDelegate {
  #config: {
    delay: number
    counter: number
    turnRight: boolean
  } | null = null

  onIdle(actor: Actor, _field: IField): MovePlan | undefined {
    if (!this.#config) {
      const { randomInt } = seed(actor.id)
      const delay = 43 + randomInt(8)
      this.#config = {
        delay,
        counter: delay,
        turnRight: randomInt(2) === 0,
      }
    }
    if (--this.#config.counter > 0) {
      return
    }

    this.#config.counter = this.#config.delay
    if (this.#config.turnRight) {
      actor.setDir(turnRight(actor.dir))
    } else {
      actor.setDir(turnLeft(actor.dir))
    }
  }
}
