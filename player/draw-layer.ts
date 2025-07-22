import { CanvasWrapper } from "../util/canvas-wrapper.ts"
import { type RectScope } from "../util/rect-scope.ts"
import type { IObj } from "../model/character.ts"

export class DrawLayer {
  #canvasWrapper: CanvasWrapper
  #viewScope: RectScope

  constructor(
    canvas: HTMLCanvasElement,
    viewScope: RectScope,
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

  drawIterable(iterable: Iterable<IObj>): void {
    this.#canvasWrapper.clear()
    for (const obj of iterable) {
      if (this.#viewScope.overlaps(obj)) {
        this.draw(obj)
      }
    }
  }

  clear(): void {
    this.#canvasWrapper.clear()
  }
}
