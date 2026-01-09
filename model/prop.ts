import { CELL_SIZE } from "../util/constants.ts"
import type {
  Dir,
  IField,
  IProp,
  LoadOptions,
  PropType,
  PushedEvent,
} from "./types.ts"
import { PropSpawnInfo } from "./field-block.ts"
import { PropDefinition } from "./catalog.ts"
import { ActionQueue, type PropAction } from "./action-queue.ts"

const fallbackImage = await fetch(
  // TODO(kt3k): Update
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADRJREFUOE9jZKAQMFKon2FoGPAfzZsoribGC0PQALxORo92bGEwDAwgKXUTkw7wGjjwBgAAiwgIEW1Cnt4AAAAASUVORK5CYII=",
).then((res) => res.blob()).then((blob) => createImageBitmap(blob))

export class Prop implements IProp {
  /** The unique identifier of the item. Only items which are spawned from block map have ids. */
  readonly id: string | null
  readonly i: number
  readonly j: number
  readonly type: PropType
  readonly def: PropDefinition
  #motion: Motion | null = null
  readonly #actionQueue = new ActionQueue<Prop, PropAction>(
    (field, action) => {
      switch (action.type) {
        case "break": {
          this.#motion = new MotionBreak(this.#image!, action.dir)
          this.#motion.cb = action.cb
          return "end"
        }
        case "remove": {
          field.props.remove(this.i, this.j)
          return "next"
        }
        default: {
          action satisfies never
          throw new Error("Unreachable")
        }
      }
    },
  )
  readonly #pushed: PushedDelegate | null
  #image: ImageBitmap | undefined

  static fromSpawn(spawn: PropSpawnInfo) {
    let pushed: PushedDelegate | null = null
    switch (spawn.def.pushed) {
      case "break":
        pushed = new PushedDelegateBreak()
        break
    }
    return new Prop(
      spawn.id,
      spawn.i,
      spawn.j,
      spawn.type,
      spawn.def,
      pushed,
    )
  }

  /**
   * @param i The column of the grid coordinate
   * @param j The row of the grid coordinate
   * @param type The type of item
   * @param src The path to the asset image
   */
  constructor(
    id: string | null,
    i: number,
    j: number,
    type: PropType,
    def: PropDefinition,
    pushed: PushedDelegate | null,
  ) {
    this.id = id
    this.i = i
    this.j = j
    this.type = type
    this.def = def
    this.#pushed = pushed
  }

  /**
   * Vanishes the prop, but keeps its space occupied
   * Useful for removing the visual representation, but keeping the processing of the action queue
   */
  vanish(): void {
    const canvas = new OffscreenCanvas(CELL_SIZE, CELL_SIZE)
    canvas.getContext("2d")
    this.#image = canvas.transferToImageBitmap()
  }

  async loadAssets(options: LoadOptions) {
    const loadImage = options.loadImage
    if (!loadImage) {
      throw new Error("Cannot load assets as loadImage not specified")
    }
    this.#image = await loadImage(this.def.href)
  }

  get assetsReady(): boolean {
    return !!this.#image
  }

  image(): ImageBitmap {
    if (this.#motion instanceof MotionBreak) {
      return this.#motion.image()
    }
    return this.#image ?? fallbackImage
  }

  get x(): number {
    return this.i * CELL_SIZE
  }

  get y(): number {
    return this.j * CELL_SIZE
  }

  get w(): number {
    return CELL_SIZE
  }

  get h(): number {
    return CELL_SIZE
  }

  get canEnter(): boolean {
    return this.def.canEnter
  }

  step(field: IField) {
    if (!this.#motion) {
      this.#actionQueue.process(this, field)
    }

    if (this.#motion) {
      this.#motion.step()
      if (this.#motion.finished) {
        this.#motion.cb?.(this.#motion)
        this.#motion = null
      }
    }
  }

  onPushed(event: PushedEvent, field: IField): void {
    this.#pushed?.onPushed(event, this, field)
  }

  enqueueActions(...actions: PropAction[]): void {
    this.#actionQueue.enqueue(...actions)
  }

  clearActions(): void {
    this.#actionQueue.clear()
  }
}

interface PushedDelegate {
  onPushed(event: PushedEvent, prop: Prop, field: IField): void
}

class PushedDelegateBreak implements PushedDelegate {
  onPushed(event: PushedEvent, prop: Prop, field: IField): void {
    prop.enqueueActions(
      { type: "wait", until: field.time + event.peakAt },
      {
        type: "break",
        dir: event.dir,
        cb: () => {
          prop.vanish()
        },
      },
      { type: "splash", hue: 0, sat: 1, light: 0, alpha: 0.15, radius: 2 },
      { type: "remove" },
    )
  }
}

interface Motion {
  step(): void
  finished: boolean
  cb?: (motion: Motion) => void
}

class MotionBreak implements Motion {
  #image: ImageBitmap
  #dir: Dir
  #positions = [...Array(16).keys()]
  cb?: (motion: Motion) => void
  constructor(image: ImageBitmap, dir: Dir) {
    this.#image = image
    this.#dir = dir
  }

  step(): void {
    const y = this.#positions.shift()!
    const canvas = new OffscreenCanvas(CELL_SIZE, CELL_SIZE)
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(this.#image, 0, 0)
    switch (this.#dir) {
      case "up":
        ctx.clearRect(0, CELL_SIZE - 1 - y, CELL_SIZE, 1)
        break
      case "down":
        ctx.clearRect(0, y, CELL_SIZE, 1)
        break
      case "left":
        ctx.clearRect(CELL_SIZE - 1 - y, 0, 1, CELL_SIZE)
        break
      case "right":
        ctx.clearRect(y, 0, 1, CELL_SIZE)
        break
    }
    this.#image = canvas.transferToImageBitmap()
  }

  image(): ImageBitmap {
    return this.#image
  }

  get finished(): boolean {
    return this.#positions.length === 0
  }
}
