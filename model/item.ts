import { CELL_SIZE } from "../util/constants.ts"
import { Actor } from "./actor.ts"
import { ItemDefinition } from "./catalog.ts"
import type { IActor, IField, IItem, ItemType, LoadOptions } from "./types.ts"
import { splashColor } from "../game/field.ts"
import { seed } from "../util/random.ts"
import { spawnActor } from "./actor.ts"
import { loadImage } from "../util/load.ts"
import { DIRS } from "../util/dir.ts"
import * as signal from "../util/signal.ts"

const fallbackImage = await fetch(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADRJREFUOE9jZKAQMFKon2FoGPAfzZsoribGC0PQALxORo92bGEwDAwgKXUTkw7wGjjwBgAAiwgIEW1Cnt4AAAAASUVORK5CYII=",
).then((res) => res.blob()).then((blob) => createImageBitmap(blob))

const lenaDef = {
  type: "inertial" as const,
  moveEnd: "inertial" as const,
  src: "../char/lena/",
  href: "/char/lena/",
}

export class Item implements IItem {
  /** The unique identifier of the item. Only items which are spawned from block map have ids. */
  readonly id: string | null
  readonly i: number
  readonly j: number
  readonly type: ItemType
  readonly def: ItemDefinition
  readonly w = CELL_SIZE
  readonly h = CELL_SIZE
  #image: ImageBitmap | undefined

  static #collectedItemIds = new Set<string>()

  static isCollected(id: string) {
    return this.#collectedItemIds.has(id)
  }

  static collect(id: string) {
    this.#collectedItemIds.add(id)
  }

  /**
   * @param i The column of the grid coordinate
   * @param j The row of the grid coordinate
   * @param type The type of item
   * @param def The item definition
   */
  constructor(
    id: string | null,
    i: number,
    j: number,
    type: ItemType,
    def: ItemDefinition,
  ) {
    this.id = id
    this.i = i
    this.j = j
    this.type = type
    this.def = def
  }

  onCollect(actor: Actor, field: IField) {
    if (this.id) {
      Item.collect(this.id)
    }
    switch (this.def.type) {
      case "apple": {
        const delegate = new CollectApple()
        delegate.onCollect(actor, field, this)
        break
      }
      case "green-apple": {
        const delegate = new CollectGreenApple()
        delegate.onCollect(actor, field, this)
        break
      }
      case "mushroom": {
        const delegate = new CollectMushroom()
        delegate.onCollect(actor, field, this)
        break
      }
      case "purple-mushroom": {
        const delegate = new CollectPurpleMushroom()
        delegate.onCollect(actor, field, this)
        break
      }
    }
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
}

interface CollectDelegate {
  onCollect(actor: IActor, field: IField, item: Item): void
}

export class CollectApple implements CollectDelegate {
  onCollect(actor: IActor, field: IField, _item: Item): void {
    field.collectItem(actor.i, actor.j)
    for (const dir of DIRS) {
      if (dir === actor.dir) continue
      if (!actor.canGo(dir, field)) continue
      const actor_ = spawnActor(
        `${actor.i}.${actor.j}.inertial.${crypto.randomUUID()}`,
        actor.i,
        actor.j,
        lenaDef,
        { dir },
      )
      actor_.loadAssets({ loadImage })
      actor_.enqueueAction({ type: "go", dir })
      field.actors.add(actor_)
    }

    const hue = 333.3
    const sat = 59.4
    const light = 32
    const alpha = 0.40
    splashColor(
      field,
      actor.i,
      actor.j,
      hue,
      sat,
      light,
      alpha,
      4,
      seed(actor.i + " " + actor.j).rng,
    )
    const count = signal.appleCount.get()
    signal.appleCount.update(count + 1)
  }
}

export class CollectGreenApple implements CollectDelegate {
  onCollect(actor: IActor, field: IField, _item: Item): void {
    field.collectItem(actor.i, actor.j)

    const hue = 113.1
    const sat = 40.4
    const light = 32
    const alpha = 0.40
    splashColor(
      field,
      actor.i,
      actor.j,
      hue,
      sat,
      light,
      alpha,
      4,
      seed(actor.i + " " + actor.j).rng,
    )

    const count = signal.greenAppleCount.get()
    signal.greenAppleCount.update(count + 1)
  }
}

export class CollectMushroom implements CollectDelegate {
  onCollect(actor: IActor, field: IField, _item: Item): void {
    field.collectItem(actor.i, actor.j)

    const hue = 21.3
    const sat = 40.4
    const light = 32
    const alpha = 0.40
    splashColor(
      field,
      actor.i,
      actor.j,
      hue,
      sat,
      light,
      alpha,
      4,
      seed(actor.i + " " + actor.j).rng,
    )

    actor.clearActionQueue()
    actor.enqueueAction(
      { type: "jump" },
      { type: "speed", change: "2x" },
    )
  }
}

export class CollectPurpleMushroom implements CollectDelegate {
  onCollect(actor: IActor, field: IField, _item: Item): void {
    field.collectItem(actor.i, actor.j)
    actor.clearActionQueue()
    actor.enqueueAction(
      { type: "jump" },
      { type: "speed", change: "4x" },
    )
    const end = () => {
      actor.enqueueAction(
        { type: "speed", change: "reset" },
        { type: "jump" },
      )
    }
    for (const _ of Array(30)) {
      actor.enqueueAction({
        type: "splash",
        hue: 280,
        sat: 40,
        light: 30,
        alpha: 0.2,
        radius: 3,
      }, {
        type: "go",
        dir: actor.dir,
        cb: (move) => {
          if (move.type === "bounce") {
            actor.clearActionQueue()
            end()
          }
        },
      })
    }
    end()
  }
}
