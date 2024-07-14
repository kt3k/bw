import { type Context, register } from "@kt3k/cell"
import { gameloop } from "@kt3k/gameloop"
import { loadImage } from "./util/load.ts"
import { Input } from "./util/dir.ts"
import { KeyMonitor } from "./ui/KeyMonitor.ts"
import { FpsMonitor } from "./ui/FpsMonitor.ts"
import { SwipeHandler } from "./ui/SwipeHandler.ts"
import { DPad } from "./ui/DPad.ts"
import { type Dir, DIRS, DOWN, LEFT, RIGHT, UP } from "./util/dir.ts"

/** The wrapper of CanvasRenderingContext2D */
class Brush {
  constructor(public ctx: CanvasRenderingContext2D) {}

  drawImage(img: HTMLImageElement, x: number, y: number) {
    this.ctx.drawImage(img, x, y)
  }

  clear() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
  }
}

/** AssetManager manages the downloading of the assets */
class AssetManager {
  images: { [key: string]: HTMLImageElement } = {}

  async loadImages(paths: string[]) {
    const images = await Promise.all(paths.map(loadImage))

    paths.forEach((path, i) => {
      this.images[path] = images[i]
    })
  }

  getImage(path: string): HTMLImageElement {
    return this.images[path]
  }
}

/** The character */
class Character {
  /** The current direction of the character */
  #dir: Dir = "down"
  /** The column of the world coordinates */
  #i: number
  /** The row of the world coordinates */
  #j: number
  /** The distance of the current movement */
  #d: number = 0
  /** The speed of the move */
  #speed: 1 | 2 | 4 | 8 | 16 = 1
  /** True when moving, false otherwise */
  #isMoving: boolean = false
  /** The prefix of assets */
  #assetPrefix: string

  constructor(
    i: number,
    j: number,
    speed: 1 | 2 | 4 | 8 | 16,
    assetPrefix: string,
  ) {
    this.#i = i
    this.#j = j
    this.#speed = speed
    this.#assetPrefix = assetPrefix
  }

  setState(state: Dir) {
    this.#dir = state
  }

  #readInput(input: typeof Input) {
    if (input.up) {
      this.setState(UP)
    } else if (input.down) {
      this.setState(DOWN)
    } else if (input.left) {
      this.setState(LEFT)
    } else if (input.right) {
      this.setState(RIGHT)
    }
  }

  step(input: typeof Input) {
    if (this.#isMoving) {
      this.#d += this.#speed
      if (this.#d == 16) {
        this.#d = 0
        this.#isMoving = false
        if (this.#dir === UP) {
          this.#j -= 1
        } else if (this.#dir === DOWN) {
          this.#j += 1
        } else if (this.#dir === LEFT) {
          this.#i -= 1
        } else if (this.#dir === RIGHT) {
          this.#i += 1
        }
      } else {
        return
      }
    }

    if (input.up || input.down || input.left || input.right) {
      this.#isMoving = true
      this.#readInput(input)
    }
  }

  appearance() {
    if (this.#d >= 8) {
      return `${this.#assetPrefix}${this.#dir}0.png`
    } else {
      return `${this.#assetPrefix}${this.#dir}1.png`
    }
  }

  /** Gets the x of the world coordinates */
  get x() {
    if (this.#isMoving) {
      if (this.#dir === LEFT) {
        return this.#i * 16 - this.#d
      } else if (this.#dir === RIGHT) {
        return this.#i * 16 + this.#d
      }
    }
    return this.#i * 16
  }

  /** Gets the x of the world coordinates */
  get y() {
    if (this.#isMoving) {
      if (this.#dir === UP) {
        return this.#j * 16 - this.#d
      } else if (this.#dir === DOWN) {
        return this.#j * 16 + this.#d
      }
    }
    return this.#j * 16
  }

  assets() {
    const assets = []
    for (const state of DIRS) {
      assets.push(
        `${this.#assetPrefix}${state}0.png`,
        `${this.#assetPrefix}${state}1.png`,
      )
    }
    return assets
  }
}

/** The area which is visible to the user */
class ViewScope {
  x: number
  y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
}

type IChar = {
  step(input: typeof Input): void
  get x(): number
  get y(): number
  appearance(): string
}

/**
 * The area which is evaluated i.e. the characters in this area are called `.step()`
 * each frame.
 */
class EvalScope {
  characters: IChar[]
  constructor(characters: IChar[]) {
    this.characters = characters
  }

  step(input: typeof Input) {
    for (const character of this.characters) {
      character.step(input)
    }
  }
}

/** The area which is loaded into the page. */
class LoadScope {}

function Canvas1({ el, pub }: Context<HTMLCanvasElement>) {
  const canvasCtx = el.getContext("2d")!
  const brush = new Brush(canvasCtx)

  const me = new Character(0, 0, 1, "./char/juni/juni_")
  const view = new ViewScope(me.x, me.y)
  const evalScope = new EvalScope([me])
  const assetManager = new AssetManager()

  const worldMap = document.querySelector(".world-map")!

  assetManager.loadImages(me.assets()).then(() => {
    const loop = gameloop(() => {
      evalScope.step(Input)

      view.x = me.x
      view.y = me.y

      brush.clear()

      for (const char of evalScope.characters) {
        brush.drawImage(
          assetManager.getImage(char.appearance()),
          char.x - view.x + 16 * 10,
          char.y - view.y + 16 * 10,
        )
      }

      worldMap.setAttribute(
        "style",
        "transform:translateX(" + (0 - view.x) + "px) translateY(" +
          (0 - view.y) + "px);",
      )
    }, 60)
    loop.onStep((fps) => pub("fps", fps))
    loop.run()
  })
}

function Canvas2({ el }: Context<HTMLCanvasElement>) {
  const WIDTH = el.width
  const HEIGHT = el.height
  const W = Math.floor(WIDTH / 16)
  const H = Math.floor(HEIGHT / 16)
  const canvasCtx = el.getContext("2d")!
  canvasCtx.fillStyle = "black"
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)

  for (let i = 0; i < W; i++) {
    for (let j = 0; j < H; j++) {
      canvasCtx.fillStyle = (i + j) % 2 === 0 ? "#222" : "#111"
      canvasCtx.fillRect(i * 16, j * 16, 16, 16)
    }
  }
}

register(Canvas1, "canvas1")
register(Canvas2, "canvas2")
register(FpsMonitor, "js-fps-monitor")
register(KeyMonitor, "js-key-monitor")
register(DPad, "js-d-pad")
register(SwipeHandler, "js-swipe-handler")
