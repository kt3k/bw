import { CELL_SIZE } from "../util/constants.ts"
import type { IEntity, IField, IProp, LoadOptions, PropType } from "./types.ts"
import { PropSpawnInfo } from "./field-block.ts"
import { PropDefinition } from "./catalog.ts"
import { type PushedEvent } from "./actor.ts"
import { splashColor } from "../game/field.ts"

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
  readonly #actionQueue = new ActionQueue<Prop, PropAction>(
    (prop, field, action) => {
      switch (action.type) {
        case "break": {
          break
        }
        case "remove": {
          field.props.remove(prop.i, prop.j)
          break
        }
        default: {
          action satisfies never
        }
      }
    },
  )
  readonly #pushed: PushedDelegate | null
  readonly w = CELL_SIZE
  readonly h = CELL_SIZE
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
    return this.#image ?? fallbackImage
  }

  get x(): number {
    return this.i * CELL_SIZE
  }

  get y(): number {
    return this.j * CELL_SIZE
  }

  get canEnter(): boolean {
    return this.def.canEnter
  }

  step(field: IField) {
    this.#actionQueue.process(this, field)
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

type CommonAction = {
  type: "wait"
  until: number
} | {
  type: "splash"
  hue: number
  sat: number
  light: number
  alpha: number
  radius: number
}

type PropAction =
  | CommonAction
  | { type: "break" }
  | { type: "remove" }

class ActionQueue<
  T extends IEntity,
  A extends Record<string, unknown>,
  R = undefined,
> {
  #queue: A[] = []
  #handler: (
    e: T,
    field: IField,
    action: Exclude<A, CommonAction>,
  ) => R | undefined

  constructor(
    handler: (
      e: T,
      field: IField,
      action: Exclude<A, CommonAction>,
    ) => R | undefined,
  ) {
    this.#handler = handler
  }

  enqueue(...actions: A[]): void {
    this.#queue.push(...actions)
  }

  clear(): void {
    this.#queue = []
  }

  process(entity: T, field: IField): R | "idle" | "wait" {
    while (true) {
      const action = this.#queue[0] as unknown as CommonAction
      if (!action) {
        return "idle"
      }

      if (action.type === "wait") {
        if (field.time < action.until) {
          return "wait"
        }
        this.#queue.shift()
        continue
      }

      this.#queue.shift()

      switch (action.type) {
        case "splash": {
          const { i, j } = entity
          splashColor(
            field,
            i,
            j,
            action.hue,
            action.sat,
            action.light,
            action.alpha,
            action.radius,
            () => 1,
          )
          break
        }
        default: {
          const result = this.#handler(entity, field, action)
          if (result) {
            return result
          }
        }
      }
    }
  }
}

interface PushedDelegate {
  onPushed(event: PushedEvent, prop: Prop, field: IField): void
}

class PushedDelegateBreak implements PushedDelegate {
  onPushed(event: PushedEvent, prop: Prop, field: IField): void {
    prop.enqueueActions(
      { type: "wait", until: field.time + event.peakAt },
      { type: "splash", hue: 0, sat: 1, light: 0, alpha: 0.15, radius: 2 },
      { type: "remove" },
    )

    // push wait until `peakAt` to action queue
    // then break animation
    // splash some color
    // remove the prop from field
  }
}
