import { CELL_SIZE } from "../util/constants.ts"
import { Actor } from "./actor.ts"
import { ItemSpawnInfo } from "./field-block.ts"
import { ItemDefinition } from "./catalog.ts"
import type {
  Dir,
  IActor,
  IField,
  IFollower,
  IItem,
  ItemType,
  LoadOptions,
  Move,
} from "./types.ts"
import { DIRS } from "../util/dir.ts"
import * as signal from "../util/signal.ts"
import { linePattern0 } from "./effect.ts"
import { ActionQueue, type ItemAction } from "./action-queue.ts"
import { MoveGo } from "./move.ts"

const fallbackImage = await fetch(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADRJREFUOE9jZKAQMFKon2FoGPAfzZsoribGC0PQALxORo92bGEwDAwgKXUTkw7wGjjwBgAAiwgIEW1Cnt4AAAAASUVORK5CYII=",
).then((res) => res.blob()).then((blob) => createImageBitmap(blob))

export class Item implements IItem {
  /** The unique identifier of the item. Only items which are spawned from block map have ids. */
  readonly id: string | null
  i: number
  j: number
  readonly type: ItemType
  readonly def: ItemDefinition
  readonly w = CELL_SIZE
  readonly h = CELL_SIZE
  #image: ImageBitmap | undefined
  #move: Move | null = null
  #lastMoveDir: Dir | null = null
  #follower: IFollower | null = null
  #followState: "following" | "waiting" | null = null
  readonly #actionQueue = new ActionQueue<Item, ItemAction>(
    (_field, action) => {
      switch (action.type) {
        case "go": {
          this.#move = new MoveGo(action.speed ?? 1, action.dir)
          switch (action.dir) {
            case "up":
              this.j -= 1
              break
            case "down":
              this.j += 1
              break
            case "left":
              this.i -= 1
              break
            case "right":
              this.i += 1
              break
          }
          return "end"
        }
        default: {
          action.type satisfies never
          throw new Error("Unreachable")
        }
      }
    },
  )

  static #collectedItemIds = new Set<string>()

  static isCollected(id: string) {
    return this.#collectedItemIds.has(id)
  }

  static collect(id: string) {
    this.#collectedItemIds.add(id)
  }

  static fromSpawn(spawn: ItemSpawnInfo): Item {
    return new Item(
      spawn.id,
      spawn.i,
      spawn.j,
      spawn.type,
      spawn.def,
    )
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
      case "fish": {
        const delegate = new CollectFish()
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
    return this.i * CELL_SIZE + (this.#move?.x ?? 0)
  }
  get y(): number {
    return this.j * CELL_SIZE + (this.#move?.y ?? 0)
  }

  step(field: IField) {
    if (!this.#move) {
      this.#actionQueue.process(this, field)
    }

    if (this.#move) {
      this.#move.step()
      if (this.#move.finished) {
        this.#move.cb?.(this.#move)
        if (this.#move.type === "move") {
          this.#lastMoveDir = this.#move.dir
        }
        this.#move = null
      }
    }
  }

  enqueueActions(...actions: ItemAction[]) {
    for (const action of actions) {
      this.#actionQueue.enqueue(action)
    }
  }

  setFollower(follower: IFollower): void {
    if (this.#follower) {
      this.#follower.setFollower(follower)
    } else {
      this.#follower = follower
    }
  }

  follow(i: number, j: number, dir: Dir, speed: 1 | 2 | 4 | 8 | 16) {
    if (this.#followState === "following") {
      this.enqueueActions({ type: "go", dir, speed })
      if (this.#follower && this.#lastMoveDir) {
        this.#follower.follow(this.i, this.j, this.#lastMoveDir, speed)
      }
    } else if (this.#followState === "waiting") {
      if (this.i === i && this.j === j) {
        this.#followState = "following"
      }
    }
  }

  unfollow() {
    console.log("unfollow", this.id, this.i, this.j)
    this.#followState = null
    if (this.#follower) {
      this.#follower.unfollow()
      this.#follower = null
    }
  }

  get isFollowing() {
    return this.#followState !== null
  }

  startFollowing() {
    this.#followState = "waiting"
  }
}

interface CollectDelegate {
  onCollect(actor: IActor, field: IField, item: Item): void
}

export class CollectApple implements CollectDelegate {
  onCollect(actor: IActor, field: IField, _item: Item): void {
    field.collectItem(actor.i, actor.j)
    const dirs = [] as Dir[]
    for (const dir of DIRS) {
      if (dir === actor.dir) continue
      if (!actor.canGo(dir, field)) continue
      const spawned = field.spawnActor("inertial", actor.i, actor.j, dir)
      if (!spawned) continue
      spawned.enqueueActions({ type: "go", dir })
      dirs.push(dir)
    }

    for (
      const effect of linePattern0(dirs, actor.i, actor.j, 1, 1, 2, "#5a0019")
    ) {
      field.effects.add(effect)
    }

    const count = signal.appleCount.get()
    signal.appleCount.update(count + 1)
  }
}

export class CollectGreenApple implements CollectDelegate {
  onCollect(actor: IActor, field: IField, _item: Item): void {
    field.collectItem(actor.i, actor.j)

    for (
      const effect of linePattern0(DIRS, actor.i, actor.j, 1, 0.7, 3, "#004000")
    ) {
      field.effects.add(effect)
    }

    const count = signal.greenAppleCount.get()
    signal.greenAppleCount.update(count + 1)
  }
}

export class CollectMushroom implements CollectDelegate {
  onCollect(actor: IActor, field: IField, _item: Item): void {
    field.collectItem(actor.i, actor.j)
    actor.clearActionQueue()
    actor.enqueueActions(
      { type: "jump" },
      { type: "speed", change: "2x" },
      { type: "add-buff", buff: "mushroom" },
      {
        type: "speed-timeout",
        timeout: 15000,
        cb: () => {
          actor.unshiftActions({ type: "remove-buff", buff: "mushroom" })
        },
      },
    )
  }
}

export class CollectPurpleMushroom implements CollectDelegate {
  onCollect(actor: IActor, field: IField, _item: Item): void {
    field.collectItem(actor.i, actor.j)
    actor.clearActionQueue()
    actor.enqueueActions(
      { type: "jump" },
      { type: "speed", change: "4x" },
    )
    const end = () => {
      actor.enqueueActions(
        { type: "speed", change: "reset" },
        { type: "jump" },
      )
    }
    let dirs = [] as Dir[], offsetI = 0, offsetJ = 0
    const offset = 2
    switch (actor.dir) {
      case "up":
        dirs = ["down"]
        offsetJ = -1 * offset
        break
      case "down":
        dirs = ["up"]
        offsetJ = 1 * offset
        break
      case "left":
        dirs = ["right"]
        offsetI = -1 * offset
        break
      case "right":
        dirs = ["left"]
        offsetI = 1 * offset
        break
    }

    for (const _ of Array(30)) {
      actor.enqueueActions({
        type: "line-pattern-0",
        dirs,
        baseSpeed: 1.3,
        p0: 0.4,
        dist: 3,
        color: "#540056",
        offsetI,
        offsetJ,
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

export class CollectFish implements CollectDelegate {
  onCollect(actor: IActor, field: IField, item: Item): void {
    if (item.isFollowing) {
      return
    }
    actor.setFollower(item)
    item.startFollowing()

    for (
      const effect of linePattern0(DIRS, actor.i, actor.j, 1, 0.7, 3, "#006e8a")
    ) {
      field.effects.add(effect)
    }
  }
}
