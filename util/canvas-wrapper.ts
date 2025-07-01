/** A simple wrapper of CanvasRenderingContext2D */
export class CanvasWrapper {
  #ctx: CanvasRenderingContext2D
  constructor(canvas: HTMLCanvasElement) {
    this.#ctx = canvas.getContext("2d")!
  }

  drawImage(img: HTMLImageElement, x: number, y: number) {
    this.#ctx.drawImage(img, x, y)
  }

  drawRect(x: number, y: number, w: number, h: number, color: string) {
    this.#ctx.fillStyle = color
    this.#ctx.fillRect(x, y, w, h)
  }

  clear() {
    this.#ctx.clearRect(0, 0, this.#ctx.canvas.width, this.#ctx.canvas.height)
  }

  /** The width of the canvas */
  get width(): number {
    return this.#ctx.canvas.width
  }

  /** The height of the canvas */
  get height(): number {
    return this.#ctx.canvas.height
  }

  get ctx(): CanvasRenderingContext2D {
    return this.#ctx
  }
}
