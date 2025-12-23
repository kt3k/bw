import { CELL_SIZE } from "../util/constants.ts"
import type { IObject, LoadOptions, ObjectType } from "./types.ts"
import { ObjectSpawnInfo } from "./field-block.ts"

const fallbackImage = await fetch(
  // TODO(kt3k): Update
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADRJREFUOE9jZKAQMFKon2FoGPAfzZsoribGC0PQALxORo92bGEwDAwgKXUTkw7wGjjwBgAAiwgIEW1Cnt4AAAAASUVORK5CYII=",
).then((res) => res.blob()).then((blob) => createImageBitmap(blob))

export class Object implements IObject {
  /** The unique identifier of the item. Only items which are spawned from block map have ids. */
  readonly id: string | null
  readonly i: number
  readonly j: number
  readonly type: ObjectType
  readonly src: string
  readonly canEnter: boolean
  readonly w = CELL_SIZE
  readonly h = CELL_SIZE
  #image: ImageBitmap | undefined

  static fromSpawn(spawn: ObjectSpawnInfo) {
    return new Object(
      spawn.id,
      spawn.i,
      spawn.j,
      spawn.type,
      spawn.canEnter,
      new URL(spawn.src, spawn.srcBase).href,
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
    type: ObjectType,
    canEnter: boolean,
    src: string,
  ) {
    this.id = id
    this.i = i
    this.j = j
    this.type = type
    this.canEnter = canEnter
    this.src = src
  }

  async loadAssets(options: LoadOptions) {
    const loadImage = options.loadImage
    if (!loadImage) {
      throw new Error("Cannot load assets as loadImage not specified")
    }
    this.#image = await loadImage(this.src)
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
