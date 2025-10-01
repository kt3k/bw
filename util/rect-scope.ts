import { floorN } from "./math.ts"
import { type IBox } from "../model/types.ts"

/**
 * Abstract rectangular area, which implements properties of the rectangle.
 * Various areas, which have special meanings, are implemented by extending this class.
 */
export abstract class RectScope {
  #w: number
  #h: number
  #left: number = 0
  #top: number = 0
  #bottom: number = 0
  #right: number = 0
  constructor(w: number, h: number) {
    this.#w = floorN(w, 2)
    this.#h = floorN(h, 2)
    this.setCenter(0, 0)
  }

  setCenter(x: number, y: number) {
    this.#left = x - this.#w / 2
    this.#top = y - this.#h / 2
    this.#right = x + this.#w / 2
    this.#bottom = y + this.#h / 2
  }
  get left() {
    return this.#left
  }
  get top() {
    return this.#top
  }
  get right() {
    return this.#right
  }
  get bottom() {
    return this.#bottom
  }
  /** The given IBox overlaps with this rectangle scope. */
  overlaps(char: IBox): boolean {
    const { x, y, w, h } = char
    return this.left <= x + w &&
      this.right >= x &&
      this.top <= y + h &&
      this.bottom >= y
  }
}
