import { type Context, register } from "@kt3k/cell"
import { gameloop } from "@kt3k/gameloop"
import { loadImage } from "./util/load.ts"
import { clearInput, Input } from "./util/dir.ts"
import { KeyMonitor } from "./ui/KeyMonitor.ts"
import { FpsMonitor } from "./ui/FpsMonitor.ts"
import { SwipeHandler } from "./ui/SwipeHandler.ts"
import { type Dir, DIRS, DOWN, LEFT, RIGHT, UP } from "./util/dir.ts"
import { randomInt } from "./util/random.ts"
import { eventHub, FPS, VIEW_SCOPE_MOVE } from "./util/eventhub.ts"

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
  /** The phase of the move */
  #movePhase: number = 0
  /** Type of the move */
  #moveType: "linear" | "bounce" = "linear"
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

  front() {
    if (this.#dir === UP) {
      return [this.#i, this.#j - 1]
    } else if (this.#dir === DOWN) {
      return [this.#i, this.#j + 1]
    } else if (this.#dir === LEFT) {
      return [this.#i - 1, this.#j]
    } else {
      return [this.#i + 1, this.#j]
    }
  }

  step(input: typeof Input, grid: number[][]) {
    if (this.#isMoving) {
      if (this.#moveType === "linear") {
        this.#movePhase += this.#speed
        this.#d += this.#speed
        if (this.#movePhase == 16) {
          this.#movePhase = 0
          this.#isMoving = false
          this.#d = 0
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
      } else if (this.#moveType === "bounce") {
        if (this.#movePhase < 8) {
          this.#d += this.#speed
        } else {
          this.#d -= this.#speed
        }
        this.#movePhase += this.#speed
        if (this.#movePhase == 16) {
          this.#movePhase = 0
          this.#isMoving = false
        } else {
          return
        }
      }
    }

    if (input.up || input.down || input.left || input.right) {
      this.#isMoving = true
      this.#readInput(input)
      const [i, j] = this.front()

      if (grid[i][j] === 2) {
        this.#moveType = "bounce"
      } else {
        this.#moveType = "linear"
      }
      this.#movePhase = 0
    }
  }

  appearance() {
    if (this.#movePhase >= 8) {
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

  get centerX() {
    return this.x + 8
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

  get centerY() {
    return this.y + 8
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

/** Rectangular area */
class RectangularArea {
  #w: number
  #h: number
  #left: number = 0
  #top: number = 0
  #bottom: number = 0
  #right: number = 0
  constructor(w: number, h: number) {
    this.#w = w
    this.#h = h
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
}

/** The area which is visible to the user */
class ViewScope extends RectangularArea {
}

type IChar = {
  step(input: typeof Input, grid: number[][]): void
  get x(): number
  get y(): number
  appearance(): string
}

/**
 * The area which is evaluated i.e. the characters in this area are called `.step()`
 * each frame.
 */
class EvalScope extends RectangularArea {
  constructor(public characters: IChar[], w: number, h: number) {
    super(w, h)
  }

  step(input: typeof Input, grid: number[][]) {
    for (const character of this.characters) {
      character.step(input, grid)
    }
  }
}

class Terrain {
  el: HTMLElement
  constructor(el: HTMLElement) {
    this.el = el
  }

  setPosition(x: number, y: number) {
    this.el.style.transform = `translateX(${x}px) translateY(${y}px)`
  }
}

function Terrain_({ el }: Context) {
  eventHub.on(VIEW_SCOPE_MOVE, (e) => {
    el.style.transform = `translateX(${e.x}px) translateY(${e.y}px)`
  })
}

/**
 * The scope to load the terrain fragment. The terrain fragment belong
 * to this area need to be loaded.
 */
class LoadScope extends RectangularArea {}

/**
 * The scope to unload the terrain fragment. The terrain fragment which
 * doesn't belong to this scope need to be unloaded
 */
class UnloadScope extends RectangularArea {}

async function GameScreen({ query, pub }: Context) {
  const canvas1 = query<HTMLCanvasElement>(".canvas1")!
  const brush = new Brush(canvas1.getContext("2d")!)

  const me = new Character(98, 102, 1, "./char/juni/juni_")
  const viewScope = new ViewScope(canvas1.width, canvas1.height)
  viewScope.setCenter(me.centerX, me.centerY)
  eventHub.emit(VIEW_SCOPE_MOVE, { x: -viewScope.left, y: -viewScope.top })

  const evalScope = new EvalScope([me], canvas1.width * 3, canvas1.height * 3)
  const assetManager = new AssetManager()

  globalThis.addEventListener("blur", () => {
    clearInput()
  })

  await assetManager.loadImages(me.assets())

  const loop = gameloop(() => {
    evalScope.step(Input, grid)

    evalScope.setCenter(me.centerX, me.centerY)
    viewScope.setCenter(me.centerX, me.centerY)
    eventHub.emit(VIEW_SCOPE_MOVE, { x: -viewScope.left, y: -viewScope.top })

    brush.clear()

    for (const char of evalScope.characters) {
      brush.drawImage(
        assetManager.getImage(char.appearance()),
        char.x - viewScope.left,
        char.y - viewScope.top,
      )
    }
  }, 60)
  loop.onStep((fps) => eventHub.emit(FPS, fps))
  loop.run()
}

const grid = [] as number[][]

function Canvas2({ el }: Context<HTMLCanvasElement>) {
  const WIDTH = el.width
  const HEIGHT = el.height
  const W = Math.floor(WIDTH / 16)
  const H = Math.floor(HEIGHT / 16)
  const canvasCtx = el.getContext("2d")!
  canvasCtx.fillStyle = "black"
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)
  // deno-lint-ignore no-explicit-any
  const colors = { 0: "#000", 1: "#000", 2: "#777" } as any
  const length = Object.keys(colors).length

  for (let i = 0; i < W; i++) {
    const row = [] as number[]
    grid.push(row)
    for (let j = 0; j < H; j++) {
      const c = randomInt(length)
      row.push(c)
      canvasCtx.fillStyle = colors[c]
      canvasCtx.fillRect(i * 16, j * 16, 16, 16)
    }
  }
}

register(Canvas2, "canvas2")
register(GameScreen, "js-game-screen")
register(FpsMonitor, "js-fps-monitor")
register(KeyMonitor, "js-key-monitor")
register(SwipeHandler, "js-swipe-handler")
register(Terrain_, "js-terrain")
