import { CanvasWrapper } from "../util/canvas-wrapper.ts"
import { type RectScope } from "../util/rect-scope.ts"
import type { IEntity } from "../model/types.ts"
import { randomInt } from "../util/random.ts"

export class DrawLayer {
  #canvasWrapper: CanvasWrapper
  #viewScope: RectScope
  #noiseCount = 0
  #enableNoise: boolean

  constructor(
    canvas: HTMLCanvasElement,
    viewScope: RectScope,
    options: { enableNoise?: boolean } = {},
  ) {
    this.#canvasWrapper = new CanvasWrapper(canvas)
    this.#viewScope = viewScope
    this.#enableNoise = options.enableNoise ?? false
  }

  draw(obj: IEntity): void {
    this.#canvasWrapper.drawImage(
      obj.image(),
      obj.x - this.#viewScope.left,
      obj.y - this.#viewScope.top,
    )
  }

  drawIterable(iterable: Iterable<IEntity>): void {
    this.#canvasWrapper.clear()
    for (const obj of iterable) {
      if (this.#viewScope.overlaps(obj)) {
        this.draw(obj)
      }
    }
    if (this.#enableNoise) {
      this.drawWhiteNoise()
    }
  }

  drawWhiteNoise(): void {
    if (this.#noiseCount > 0) {
      this.#noiseCount--
    } else if (Math.random() > 0.001) {
      return
    } else {
      this.#noiseCount = randomInt(6) + 1
    }
    this.#canvasWrapper.ctx.fillStyle = "white"
    for (const _ of Array(randomInt(500))) {
      const i = randomInt(this.#canvasWrapper.width)
      const j = randomInt(this.#canvasWrapper.height)
      this.#canvasWrapper.ctx.fillRect(i, j, 4, 1)
    }
  }

  clear(): void {
    this.#canvasWrapper.clear()
  }
}
