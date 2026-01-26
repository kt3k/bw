import type { Dir, IColorBox, IField, IFinishable, IStepper } from "./types.ts"

export class EffectLine implements IColorBox, IFinishable, IStepper {
  #startX: number
  #startY: number
  #dir: Dir
  #length: number
  #speed: number
  #duration: number
  #x: number
  #y: number
  #tipX: number
  #tipY: number
  #w: number = 1
  #h: number = 1
  #tipStop = false
  constructor(
    startX: number,
    startY: number,
    dir: Dir,
    public color: string,
    length: number,
    duration: number,
    speed: number = 1,
  ) {
    this.#x = this.#tipX = this.#startX = startX
    this.#y = this.#tipY = this.#startY = startY
    this.#dir = dir
    this.#length = length
    this.#speed = speed
    this.#duration = duration
  }

  step(_field: IField): void {
    switch (this.#dir) {
      case "up":
        if (!this.#tipStop) this.#tipY -= this.#speed
        this.#h = Math.min(Math.abs(this.#tipY - this.#startY), this.#length)
        this.#y = this.#tipY
        break
      case "down":
        if (!this.#tipStop) this.#tipY += this.#speed
        this.#h = Math.min(Math.abs(this.#tipY - this.#startY), this.#length)
        this.#y = this.#tipY - this.#h
        break
      case "left":
        if (!this.#tipStop) this.#tipX -= this.#speed
        this.#w = Math.min(Math.abs(this.#tipX - this.#startX), this.#length)
        this.#x = this.#tipX
        break
      case "right":
        if (!this.#tipStop) this.#tipX += this.#speed
        this.#w = Math.min(Math.abs(this.#tipX - this.#startX), this.#length)
        this.#x = this.#tipX - this.#w
        break
    }
    this.#duration--
    if (this.#duration * this.#speed < this.#length) {
      this.#tipStop = true
      this.#length = this.#duration * this.#speed
    }
  }
  get x(): number {
    return this.#x
  }
  get y(): number {
    return this.#y
  }
  get w(): number {
    return this.#w
  }
  get h(): number {
    return this.#h
  }
  get finished(): boolean {
    return this.#duration <= 0
  }
}
