import { type Context, register } from "@kt3k/cell"
import { gameloop } from "@kt3k/gameloop"
import { loadImage } from "./util/load.ts"
import { clearInput, Input } from "./util/dir.ts"
import { KeyMonitor } from "./ui/KeyMonitor.ts"
import { FpsMonitor } from "./ui/FpsMonitor.ts"
import { SwipeHandler } from "./ui/SwipeHandler.ts"
import { type Dir, DOWN, LEFT, RIGHT, UP } from "./util/dir.ts"
import { randomInt } from "./util/random.ts"
import { fpsSignal, isLoadingSignal, viewScopeSignal } from "./util/signal.ts"
import { LoadingIndicator } from "./ui/LoadingIndicator.ts"

const CELL_UNIT = 16

/** A simple wrapper of CanvasRenderingContext2D */
class Brush {
  constructor(public ctx: CanvasRenderingContext2D) {}

  drawImage(img: HTMLImageElement, x: number, y: number) {
    this.ctx.drawImage(img, x, y)
  }

  clear() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
  }
}

/**
 * Map represents the map of terrain
 */
class Map {
  x: number
  y: number
  w: number
  h: number
  // deno-lint-ignore no-explicit-any
  constructor(obj: any) {
    this.x = obj.x
    this.y = obj.y
    this.w = obj.w
    this.h = obj.h
  }
}

/**
 * AssetManager manages the downloading of the assets.
 * Deprecated.
 */
class AssetManager {
  maps: { [key: string]: Map } = {}

  loadMaps(maps: string[]) {
    return Promise.all(
      maps.map(async (x) => {
        const resp = await fetch(x)
        return new Map(await resp.json())
      }),
    )
  }

  async #loadMap(path: string): Promise<Map> {
    const resp = await fetch(path)
    return new Map(await resp.json())
  }
}

type CharacterAppearance =
  | "up0"
  | "up1"
  | "down0"
  | "down1"
  | "left0"
  | "left1"
  | "right0"
  | "right1"

type CharacterAssets = {
  [K in CharacterAppearance]: HTMLImageElement
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
  /** The images necessary to render this character */
  #assets?: CharacterAssets

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
          this.#d += this.#speed / 2
        } else {
          this.#d -= this.#speed / 2
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
      return this.#assets![`${this.#dir}0`]
    } else {
      return this.#assets![`${this.#dir}1`]
    }
  }

  /** Gets the x of the world coordinates */
  get x() {
    if (this.#isMoving) {
      if (this.#dir === LEFT) {
        return this.#i * CELL_UNIT - this.#d
      } else if (this.#dir === RIGHT) {
        return this.#i * CELL_UNIT + this.#d
      }
    }
    return this.#i * CELL_UNIT
  }

  get centerX() {
    return this.x + CELL_UNIT / 2
  }

  /** Gets the y of the world coordinates */
  get y() {
    if (this.#isMoving) {
      if (this.#dir === UP) {
        return this.#j * CELL_UNIT - this.#d
      } else if (this.#dir === DOWN) {
        return this.#j * CELL_UNIT + this.#d
      }
    }
    return this.#j * CELL_UNIT
  }

  get centerY() {
    return this.y + CELL_UNIT / 2
  }

  /**
   * Loads the assets and store resulted HTMLImageElement in the fields.
   * Assets are managed like this way to make garbage collection easier.
   */
  async loadAssets() {
    const [up0, up1, down0, down1, left0, left1, right0, right1] = await Promise
      .all([
        `${this.#assetPrefix}up0.png`,
        `${this.#assetPrefix}up1.png`,
        `${this.#assetPrefix}down0.png`,
        `${this.#assetPrefix}down1.png`,
        `${this.#assetPrefix}left0.png`,
        `${this.#assetPrefix}left1.png`,
        `${this.#assetPrefix}right0.png`,
        `${this.#assetPrefix}right1.png`,
      ].map(loadImage))
    this.#assets = {
      up0,
      up1,
      down0,
      down1,
      left0,
      left1,
      right0,
      right1,
    }
  }

  get assetsReady() {
    return !!this.#assets
  }
}

/**
 * Abstract rectangular area, which implements properties of the rectangle.
 * Various areas, which have special meanings, are implemented by extending this class.
 */
abstract class RectArea {
  #w: number
  #h: number
  #left: number = 0
  #top: number = 0
  #bottom: number = 0
  #right: number = 0
  constructor(w: number, h: number) {
    this.#w = w
    this.#h = h
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
}

/**
 * The area which is visible to the user
 * The center of this area is the center of the screen
 * The center of this area usually follows the 'me' character
 */
class ViewScope extends RectArea {
  override setCenter(x: number, y: number): void {
    super.setCenter(x, y)
    viewScopeSignal.updateByFields({ x: -this.left, y: -this.top })
  }
}

type IChar = {
  step(input: typeof Input, grid: number[][]): void
  get x(): number
  get y(): number
  appearance(): HTMLImageElement
  get assetsReady(): boolean
}

/**
 * The area which is evaluated i.e. the characters in this area are called `.step()`
 * each frame.
 */
class EvalScope extends RectArea {
  constructor(public characters: IChar[], w: number, h: number) {
    super(w, h)
  }

  step(input: typeof Input, grid: number[][]): void {
    for (const character of this.characters) {
      character.step(input, grid)
    }
  }

  /** This can be optimized by filtering the characters by their coordinates and view screen scope */
  get visible(): IChar[] {
    return this.characters
  }

  get assetsReady(): boolean {
    return this.visible.every((x) => x.assetsReady)
  }
}

function TerrainWrap({ el }: Context) {
  const setStyleTransform = ({ x, y }: { x: number; y: number }) => {
    el.style.transform = `translateX(${x}px) translateY(${y}px`
  }
  viewScopeSignal.onChange(setStyleTransform)
  setStyleTransform(viewScopeSignal.get())
}

/**
 * The scope to load the terrain fragment. The terrain fragment belong
 * to this area need to be loaded.
 */
export class LoadScope extends RectArea {
  static LOAD_UNIT = 200 * CELL_UNIT
  static ceil(n: number): number {
    return Math.ceil(n / this.LOAD_UNIT) * this.LOAD_UNIT
  }

  static floor(n: number): number {
    return Math.floor(n / this.LOAD_UNIT) * this.LOAD_UNIT
  }

  maps() {
    const { LOAD_UNIT } = LoadScope
    const left = LoadScope.floor(this.left)
    const right = LoadScope.ceil(this.right)
    const top = LoadScope.floor(this.top)
    const bottom = LoadScope.ceil(this.bottom)
    const list = []
    for (let x = left; x < right; x += LOAD_UNIT) {
      for (let y = top; y < bottom; y += LOAD_UNIT) {
        const i = x / CELL_UNIT
        const j = y / CELL_UNIT
        list.push(`map/map_${i}.${j}.json`)
      }
    }
    return list
  }
}

/**
 * The scope to unload the terrain fragment. The terrain fragment which
 * doesn't belong to this scope need to be unloaded
 */
class UnloadScope extends RectArea {}

async function GameScreen({ query }: Context) {
  const canvas1 = query<HTMLCanvasElement>(".canvas1")!
  const brush = new Brush(canvas1.getContext("2d")!)

  const me = new Character(98, 102, 1, "char/juni/juni_")
  const viewScope = new ViewScope(canvas1.width, canvas1.height)
  viewScope.setCenter(me.centerX, me.centerY)

  // The load scope unit is 200 x 200 grid (3200 x 3200 px)
  // A tile of the size 3200 x 3200 px are placed in every direction
  // 4 tiles which overlap with the area of 3200 x 3200 px surrounding 'me'
  // are loaded.
  const loadScope = new LoadScope(3200, 3200)
  loadScope.setCenter(me.centerX, me.centerY)

  const evalScope = new EvalScope([me], canvas1.width * 3, canvas1.height * 3)
  const assetManager = new AssetManager()

  const maps = await assetManager.loadMaps(loadScope.maps())
  console.log(maps)

  globalThis.addEventListener("blur", () => {
    clearInput()
  })

  await me.loadAssets()

  const loop = gameloop(() => {
    if (!evalScope.assetsReady) {
      isLoadingSignal.update(true)
      return
    }
    isLoadingSignal.update(false)
    evalScope.step(Input, grid)

    evalScope.setCenter(me.centerX, me.centerY)
    viewScope.setCenter(me.centerX, me.centerY)

    brush.clear()

    for (const char of evalScope.visible) {
      brush.drawImage(
        char.appearance(),
        char.x - viewScope.left,
        char.y - viewScope.top,
      )
    }
  }, 60)
  loop.onStep((fps) => fpsSignal.update(fps))
  loop.run()
}

const grid = [] as number[][]

function Canvas2({ el }: Context<HTMLCanvasElement>) {
  const WIDTH = el.width
  const HEIGHT = el.height
  const W = Math.floor(WIDTH / CELL_UNIT)
  const H = Math.floor(HEIGHT / CELL_UNIT)
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
      canvasCtx.fillRect(i * CELL_UNIT, j * CELL_UNIT, CELL_UNIT, CELL_UNIT)
    }
  }
}

register(Canvas2, "canvas2")
register(GameScreen, "js-game-screen")
register(FpsMonitor, "js-fps-monitor")
register(KeyMonitor, "js-key-monitor")
register(SwipeHandler, "js-swipe-handler")
register(TerrainWrap, "js-terrain")
register(LoadingIndicator, "js-loading-indicator")
