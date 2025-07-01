import { loadImage } from "../util/load.ts"
import { CELL_SIZE } from "../util/constants.ts"

export class Item {
  #i: number
  #j: number
  #assetPath: string
  #assets: HTMLImageElement | undefined

  /**
   * @param i The column of the grid coordinate
   * @param j The row of the grid coordinate
   * @param assetPath The path to the asset image
   */
  constructor(i: number, j: number, assetPath: string) {
    this.#i = i
    this.#j = j
    this.#assetPath = assetPath
  }

  async loadAssets() {
    this.#assets = await loadImage(this.#assetPath)
  }

  get assetsReady(): boolean {
    return !!this.#assets
  }

  image(): HTMLImageElement {
    return this.#assets!
  }

  get x(): number {
    return this.#i * CELL_SIZE
  }
  get y(): number {
    return this.#j * CELL_SIZE
  }
  get w(): number {
    return CELL_SIZE
  }
  get h(): number {
    return CELL_SIZE
  }
  get i(): number {
    return this.#i
  }
  get j(): number {
    return this.#j
  }
}
