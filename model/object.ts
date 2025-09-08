import { loadImage } from "../util/load.ts"
import { CELL_SIZE } from "../util/constants.ts"
import type { IDrawable } from "./drawable.ts"

export type ObjectType = "chair" | "table"

export type IObject = IDrawable & {
  id: string | null
  type: ObjectType
}

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
  readonly w = CELL_SIZE
  readonly h = CELL_SIZE
  #image: ImageBitmap | undefined

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
    src: string,
  ) {
    this.id = id
    this.i = i
    this.j = j
    this.type = type
    this.src = src
  }

  async loadAssets() {
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
