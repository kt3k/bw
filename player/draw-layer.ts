import { CanvasWrapper } from "../util/canvas-wrapper.ts"
import type { IObj } from "../model/character.ts"

export class DrawLayer {
  #canvasWrapper: CanvasWrapper
  #viewScope: { left: number; top: number }

  constructor(
    canvas: HTMLCanvasElement,
    viewScope: { left: number; top: number },
  ) {
    this.#canvasWrapper = new CanvasWrapper(canvas)
    this.#viewScope = viewScope
  }

  draw(obj: IObj): void {
    this.#canvasWrapper.drawImage(
      obj.image(),
      obj.x - this.#viewScope.left,
      obj.y - this.#viewScope.top,
    )
  }

  clear(): void {
    this.#canvasWrapper.clear()
  }
}
