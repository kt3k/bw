import { loadImage } from "../util/load.ts"
import { CELL_SIZE } from "../util/constants.ts"
import type { IItem, ItemType } from "./character.ts"

const fallbackImage = await fetch(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADRJREFUOE9jZKAQMFKon2FoGPAfzZsoribGC0PQALxORo92bGEwDAwgKXUTkw7wGjjwBgAAiwgIEW1Cnt4AAAAASUVORK5CYII=",
).then((res) => res.blob()).then((blob) => createImageBitmap(blob))

export class Item implements IItem {
  readonly i: number
  readonly j: number
  readonly type: ItemType
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
  constructor(i: number, j: number, type: ItemType, src: string) {
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
