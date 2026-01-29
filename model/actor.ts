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
import { CELL_SIZE } from "../util/constants.ts"
import { seed } from "../util/random.ts"
import type {
  Action,
  CommonMove,
  Dir,
  IActor,
  IField,
  LoadOptions,
  Move,
  PushedEvent,
} from "./types.ts"
import { ActorDefinition } from "./catalog.ts"
import { ActionQueue, type ActorAction } from "./action-queue.ts"
import { ActorSpawnInfo } from "./field-block.ts"
import { linePattern0 } from "./effect.ts"

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

export function spawnActor(
  id: string,
  i: number,
  j: number,
  def: ActorDefinition,
  { dir = "down", speed = 1 }: { dir?: Dir; speed?: 1 | 2 | 4 | 8 | 16 } = {},
): Actor {
  let moveEnd: MoveEndDelegate | null = null
  let idle: IdleDelegate | null = null
  switch (def.moveEnd) {
    case "inertial":
      moveEnd = new MoveEndDelegateInertial()
      break
  }
  switch (def.idle) {
    case "random-rotate":
      idle = new IdleDelegateRandomRotate()
      break
    case "random-walk":
      idle = new IdleDelegateRandomWalk()
      break
    case "wander":
      idle = new IdleDelegateWander()
      break
  }
  return new Actor(i, j, def, id, dir, speed, moveEnd, idle)
}

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

/**
 * The actor class
 */
export class Actor implements IActor {
  /** The current direction of the actor */
  #dir: Dir
  /** The column of the world coordinates */
  #i: number
  /** The row of the world coordinates */
  #j: number
  /** The id of the actor */
  #id: string
  /** The speed of the move */
  #speed: 1 | 2 | 4 | 8 | 16
  /** The counter of the idle state */
  #idleCounter = 0
  /** The key of the physical grid, which is used for collision detection */
  #physicalGridKey: string
  /** The prefix of assets */
  #def: ActorDefinition
  /** The images necessary to render this actor */
  #assets?: ActorAssets
  /** The timer for speed up actions */
  #speedUpTimer: ReturnType<typeof setTimeout> | undefined
  /** The callback when speed up times out */
  #speedUpCb?: () => void
  /** The move of the actor */
  #move: Move | null = null
  /** MoveEnd delegate */
  #moveEnd: MoveEndDelegate | null
  /** Idle delegate */
  #idle: IdleDelegate | null
  /** buff labels */
  buff: Record<string, unknown> = { __proto__: null }

  /** The queue of actions to be performed */
  #actionQueue: ActionQueue<Actor, ActorAction> = new ActionQueue(
    (field, action) => {
      switch (action.type) {
        case "speed": {
          clearTimeout(this.#speedUpTimer)
          this.#speedUpCb?.()
          this.#speedUpCb = undefined
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
          return "next"
        }
        case "speed-timeout": {
          this.#speedUpTimer = setTimeout(() => {
            this.enqueueActions(
              { type: "speed", change: "reset" },
              { type: "jump" },
            )
            this.#speedUpCb?.()
          }, action.timeout)
          this.#speedUpCb?.()
          this.#speedUpCb = action.cb
          return "next"
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
          return "next"
        }
        case "go-random": {
          const { choice } = seed(`${this.i}.${this.j}`)
          const dir = choice(DIRS)
          this.setDir(dir)
          this.#move = new MoveGo(this.#speed, dir)
          return "end"
        }
        case "go":
        case "slide": {
          this.tryMove(action.type, action.dir, field, action.cb)
          return "end"
        }
        case "jump": {
          this.jump(action.cb)
          return "end"
        }
        case "add-buff": {
          console.trace("add-buff")
          this.buff[action.buff] = "value" in action ? action.value : true
          return "next"
        }
        case "remove-buff": {
          console.trace("remove-buff")
          delete this.buff[action.buff]
          return "next"
        }
        default: {
          action satisfies never
          throw new Error("Unreachable")
        }
      }
    },
  )

  static fromSpawn(spawn: ActorSpawnInfo): Actor {
    return spawnActor(spawn.id, spawn.i, spawn.j, spawn.def, {
      dir: spawn.dir,
      speed: spawn.speed,
    })
  }

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

  tryMove(
    type: "go" | "slide",
    dir: Dir,
    field: IField,
    cb?: (move: Move) => void,
  ) {
    if (type === "go") this.setDir(dir)
    if (this.canGo(dir, field)) {
      this.#move = new MoveGo(this.#speed, dir)
      const [nextI, nextJ] = this.nextGrid(dir)
      // actor position moves to the next grid immediately (the animation catches it up in 16 frames)
      this.#i = nextI
      this.#j = nextJ
      this.#physicalGridKey = this.#calcPhysicalGridKey()
    } else {
      const [i, j] = this.nextGrid(dir)
      const ev = { type: "pushed", dir, peakAt: 7 } as const
      let actorPushed = false
      for (const actor of field.actors.get(i, j)) {
        actorPushed = true
        actor.onPushed(ev, field)
      }
      field.props.get(i, j)?.onPushed(ev, field)
      this.#move = new MoveBounce(
        dir,
        actorPushed,
        this.#speed,
      )
    }
    this.#move.cb = cb
    this.#idleCounter = 0
  }

  jump(cb?: (move: Move) => void) {
    this.#move = new MoveJump()
    this.#move.cb = cb
    this.#idleCounter = 0
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

  enqueueActions(...actions: Action[]) {
    this.#actionQueue.enqueue(...actions)
  }

  unshiftActions(...actions: Action[]) {
    this.#actionQueue.unshift(...actions)
  }

  clearActionQueue() {
    this.#actionQueue.clear()
  }

  isActionQueueEmpty(): boolean {
    return this.#actionQueue.isEmpty()
  }

  step(field: IField) {
    if (this.#move === null) {
      const state = this.#actionQueue.process(this, field)
      if (state === "idle") {
        this.#idle?.onIdle(this, field)
      }
    }

    if (this.#move) {
      this.#move.step()
      if (this.#move.finished) {
        this.#move.cb?.(this.#move)
        this.#moveEnd?.onMoveEnd(this, field, this.#move)
        this.#move = null
      }
    } else {
      this.#idleCounter += 1
    }
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

  onPushed(event: PushedEvent, field: IField): void {
    let i = this.i, j = this.j
    switch (event.dir) {
      case "up":
        j++
        break
      case "down":
        j--
        break
      case "left":
        i++
        break
      case "right":
        i--
        break
    }
    for (
      const effect of linePattern0([event.dir], i, j, 1, 0.3, 3, "white")
    ) {
      field.effects.add(effect)
    }

    if (this.#move) {
      this.unshiftActions({ type: "slide", dir: event.dir })
    } else {
      this.enqueueActions({ type: "wait", until: field.time + event.peakAt })
      this.enqueueActions({ type: "slide", dir: event.dir })
    }
  }
}

export interface MoveEndDelegate {
  onMoveEnd(actor: Actor, field: IField, move: Move): void
}

export class MoveEndDelegateInertial implements MoveEndDelegate {
  onMoveEnd(actor: Actor, _field: IField, move: Move): void {
    if (!actor.isActionQueueEmpty()) {
      return
    }

    switch (move.type) {
      case "move": {
        actor.enqueueActions({ type: "go", dir: move.dir })
        break
      }
      case "bounce": {
        if (!move.pushedActors) {
          // The actor was bounced to the wall.
          // In that case, the actor go back to the opposite direction
          actor.enqueueActions({ type: "go", dir: opposite(move.dir) })
        }
      }
    }
  }
}

export interface IdleDelegate {
  onIdle(actor: Actor, field: IField): void
}

export class IdleDelegateRandomWalk implements IdleDelegate {
  onIdle(actor: Actor, field: IField): void {
    const dirs = DIRS.filter((d) => {
      const [i, j] = actor.nextGrid(d)
      return field.canEnterStatic(i, j)
    })
    if (dirs.length === 0) {
      return
    }
    const { choice } = seed(
      field.time.toString() + actor.i.toString() + actor.j.toString(),
    )
    actor.tryMove("go", choice(dirs), field)
    return
  }
}

export class IdleDelegateWander implements IdleDelegate {
  #counter = 32
  onIdle(actor: Actor, field: IField): void {
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
        actor.tryMove("go", actor.dir, field)
        return
      }
      if (randomInt(2) === 0) {
        actor.jump()
      }
      const nextCandidate = DIRS.filter((d) => actor.canGo(d, field))
      if (nextCandidate.length === 0) {
        actor.enqueueActions({
          type: "turn",
          dir: choice(["left", "right"]),
        })
        return
      }
      actor.tryMove("go", choice(nextCandidate), field)
    }
  }
}

export class IdleDelegateRandomRotate implements IdleDelegate {
  #config: {
    delay: number
    counter: number
    turnRight: boolean
  } | null = null

  onIdle(actor: Actor, _field: IField): void {
    if (!this.#config) {
      // init
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
