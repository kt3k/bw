import { type Context, register } from "@kt3k/cell"
import { gameloop } from "@kt3k/gameloop"
import { loadImage } from "./util/load.ts"
import { clearInput, Input } from "./util/dir.ts"
import { KeyMonitor } from "./ui/KeyMonitor.ts"
import { FpsMonitor } from "./ui/FpsMonitor.ts"
import { SwipeHandler } from "./ui/SwipeHandler.ts"
import { type Dir, DOWN, LEFT, RIGHT, UP } from "./util/dir.ts"
import { fpsSignal, isLoadingSignal, viewScopeSignal } from "./util/signal.ts"
import { LoadingIndicator } from "./ui/LoadingIndicator.ts"
import { Brush } from "./util/brush.ts"

const CELL_UNIT = 16

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

  /** Returns the grid coordinates of the 1 cell front of the character. */
  front(): [i: number, j: number] {
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

  /*
  step(input: typeof Input, terrain: Terrain) {
    const [i, j] = this.front()
    const cell = terrain.get(i, j)
    if (cell.canEnter()) {
      // ...
    } else {
      // ...
    }
  }
  */

  step(input: typeof Input, terrain: Terrain) {
    if (
      this.#movePhase === 0 &&
      (input.up || input.down || input.left || input.right)
    ) {
      this.#isMoving = true
      this.#readInput(input)
      const [i, j] = this.front()
      const cell = terrain.get(i, j)

      if (cell.canEnter()) {
        this.#moveType = "linear"
      } else {
        this.#moveType = "bounce"
      }
    }

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
        }
      } else if (this.#moveType === "bounce") {
        this.#movePhase += this.#speed
        if (this.#movePhase < 8) {
          this.#d += this.#speed / 2
        } else {
          this.#d -= this.#speed / 2
        }
        if (this.#movePhase == 16) {
          this.#movePhase = 0
          this.#isMoving = false
          this.#d = 0
        }
      }
    }
  }

  image() {
    if (this.#movePhase >= 8) {
      return this.#assets![`${this.#dir}0`]
    } else {
      return this.#assets![`${this.#dir}1`]
    }
  }

  /** Gets the x of the world coordinates */
  get x() {
    if (this.#dir === LEFT) {
      return this.#i * CELL_UNIT - this.#d
    } else if (this.#dir === RIGHT) {
      return this.#i * CELL_UNIT + this.#d
    } else {
      return this.#i * CELL_UNIT
    }
  }

  get centerX() {
    return this.x + CELL_UNIT / 2
  }

  /** Gets the y of the world coordinates */
  get y() {
    if (this.#dir === UP) {
      return this.#j * CELL_UNIT - this.#d
    } else if (this.#dir === DOWN) {
      return this.#j * CELL_UNIT + this.#d
    } else {
      return this.#j * CELL_UNIT
    }
  }

  get h() {
    return CELL_UNIT
  }

  get w() {
    return CELL_UNIT
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

abstract class Scope extends RectArea {
  includes(char: IChar): boolean {
    const { x, y, w, h } = char
    return this.left <= x + w &&
      this.right >= x &&
      this.top <= y + h &&
      this.bottom >= y
  }
}

/**
 * The area which is visible to the user
 * The center of this area is the center of the screen
 * The center of this area usually follows the 'me' character
 */
class ViewScope extends Scope {
  override setCenter(x: number, y: number): void {
    super.setCenter(x, y)
    viewScopeSignal.updateByFields({ x: -this.left, y: -this.top })
  }
}

type IChar = {
  step(input: typeof Input, terrain: Terrain): void
  get x(): number
  get y(): number
  get w(): number
  get h(): number
  image(): HTMLImageElement
  get assetsReady(): boolean
}

class Walkers {
  #walkers: IChar[] = []
  add(walker: IChar) {
    this.#walkers.push(walker)
  }

  step(input: typeof Input, terrain: Terrain) {
    for (const walker of this.#walkers) {
      walker.step(input, terrain)
    }
  }

  get assetsReady(): boolean {
    return this.#walkers.every((x) => x.assetsReady)
  }

  [Symbol.iterator]() {
    return this.#walkers[Symbol.iterator]()
  }
}

/**
 * The characters in this scope are evaluated in each frame
 */
class WalkScope extends RectArea {
}

type MapId = [k: number, l: number]

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

  #loading = new Set()

  loadMaps(mapIds: MapId[]) {
    const maps = mapIds.map(([k, l]) => `map/map_${k}.${l}.json`)
    return Promise.all(maps.map((map) => this.#loadMap(map)))
  }

  async #loadMap(url: string) {
    this.#loading.add(url)
    const resp = await fetch(url)
    const map = new Map(await resp.json())
    this.#loading.delete(url)
    return map
  }

  mapIds(): MapId[] {
    const { LOAD_UNIT } = LoadScope
    const left = LoadScope.floor(this.left)
    const right = LoadScope.ceil(this.right)
    const top = LoadScope.floor(this.top)
    const bottom = LoadScope.ceil(this.bottom)
    const list = [] as MapId[]
    for (let x = left; x < right; x += LOAD_UNIT) {
      for (let y = top; y < bottom; y += LOAD_UNIT) {
        const i = x / CELL_UNIT
        const j = y / CELL_UNIT
        list.push([i, j])
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

/** Item represents the item in the terrain */
class Item {}

class TerrainCell {
  #color?: string
  #href?: string
  #canEnter: boolean
  constructor(canEnter: boolean, color?: string, href?: string) {
    this.#canEnter = canEnter
    this.#color = color
    this.#href = href
  }

  canEnter(): boolean {
    return this.#canEnter
  }

  get color() {
    return this.#color
  }
}

/**
 * Map represents the map of terrain
 */
class Map {
  // The column of the world coordinates
  i: number
  // The row of the world coordinates
  j: number
  cells: {
    name: string
    canEnter: boolean
    color?: string
    href?: string
  }[]
  characters: {}[]
  items: {}[]
  terrain: string[]
  // deno-lint-ignore no-explicit-any
  constructor(obj: any) {
    this.i = obj.i
    this.j = obj.j
    this.cells = obj.cells
    this.characters = obj.characters
    this.items = obj.items
    this.terrain = obj.terrain
  }
}

class TerrainDistrict {
  // The column of the world coordinates
  #i: number
  // The row of the world coordinates
  #j: number
  #cellMap: Record<string, TerrainCell> = {}
  #items: Item[]
  #characters: Character[]
  #terrain: string[]
  constructor(map: Map) {
    this.#i = map.i
    this.#j = map.j
    for (const cell of map.cells) {
      this.#cellMap[cell.name] = new TerrainCell(
        cell.canEnter,
        cell.color,
        cell.href,
      )
    }
    this.#terrain = map.terrain
    this.#items = map.items
    this.#characters = []
  }

  get(i: number, j: number): TerrainCell {
    return this.#cellMap[this.#terrain[j][i]]
  }

  get i() {
    return this.#i
  }

  get j() {
    return this.#j
  }
}

function createCanvasForDistrict(
  district: TerrainDistrict,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas")
  canvas.width = 3200
  canvas.height = 3200
  canvas.style.position = "absolute"
  canvas.style.left = `${district.i * CELL_UNIT}px`
  canvas.style.top = `${district.j * CELL_UNIT}px`
  return [canvas, canvas.getContext("2d")!] as [
    HTMLCanvasElement,
    CanvasRenderingContext2D,
  ]
}

function renderDistrict(brush: Brush, district: TerrainDistrict) {
  for (let j = 0; j < 200; j++) {
    for (let i = 0; i < 200; i++) {
      const cell = district.get(i, j)
      brush.ctx.fillStyle = cell.color || "black"
      brush.ctx.fillRect(i * CELL_UNIT, j * CELL_UNIT, CELL_UNIT, CELL_UNIT)
    }
  }
}

class Terrain {
  #districts: Record<string, TerrainDistrict> = {}
  addDistrict(district: TerrainDistrict) {
    this.#districts[`${district.i}.${district.j}`] = district
  }

  get(i: number, j: number) {
    const k = Math.floor(i / 200) * 200
    const l = Math.floor(j / 200) * 200
    const district = this.#districts[`${k}.${l}`]
    let i_ = i % 200
    let j_ = j % 200
    if (i_ < 0) {
      i_ += 200
    }
    if (j_ < 0) {
      j_ += 200
    }
    return district.get(i_, j_)
  }

  hasDistrict(k: number, l: number) {
    return !!this.#districts[`${k}.${l}`]
  }
}

async function GameScreen({ query }: Context) {
  const canvas1 = query<HTMLCanvasElement>(".canvas1")!
  const brush = new Brush(canvas1.getContext("2d")!)

  const me = new Character(2, 2, 1, "char/juni/juni_")

  const viewScope = new ViewScope(canvas1.width, canvas1.height)
  viewScope.setCenter(me.centerX, me.centerY)

  // The load scope unit is 200 x 200 grid (3200 x 3200 px)
  // A tile of the size 3200 x 3200 px are placed in every direction
  // 4 tiles which overlap with the area of 3200 x 3200 px surrounding 'me'
  // are loaded.
  const loadScope = new LoadScope(3200, 3200)
  loadScope.setCenter(me.centerX, me.centerY)

  const walkScope = new WalkScope(canvas1.width * 3, canvas1.height * 3)
  walkScope.setCenter(me.centerX, me.centerY)

  globalThis.addEventListener("blur", () => {
    clearInput()
  })

  const walkers = new Walkers()
  walkers.add(me)

  const terrain = new Terrain()
  const mapIdsToLoad = loadScope.mapIds().filter(([k, l]) =>
    !terrain.hasDistrict(k, l)
  )

  const maps = await loadScope.loadMaps(mapIdsToLoad)
  const terrainEl = query(".terrain")!
  for (const map of maps) {
    const district = new TerrainDistrict(map)
    terrain.addDistrict(district)
    const [canvas, ctx] = createCanvasForDistrict(district)
    renderDistrict(new Brush(ctx), district)
    terrainEl.appendChild(canvas)
  }

  const setStyleTransform = ({ x, y }: { x: number; y: number }) => {
    terrainEl.style.transform = `translateX(${x}px) translateY(${y}px`
  }
  viewScopeSignal.onChange(setStyleTransform)
  setStyleTransform(viewScopeSignal.get())

  await me.loadAssets()

  const loop = gameloop(() => {
    if (!walkers.assetsReady) {
      isLoadingSignal.update(true)
      return
    }
    isLoadingSignal.update(false)

    walkers.step(Input, terrain)

    walkScope.setCenter(me.centerX, me.centerY)
    viewScope.setCenter(me.centerX, me.centerY)
    loadScope.setCenter(me.centerX, me.centerY)

    brush.clear()

    for (const walker of walkers) {
      if (!viewScope.includes(walker)) {
        continue
      }
      brush.drawImage(
        walker.image(),
        walker.x - viewScope.left,
        walker.y - viewScope.top,
      )
    }
  }, 60)
  loop.onStep((fps) => fpsSignal.update(fps))
  loop.run()
}

register(GameScreen, "js-game-screen")
register(FpsMonitor, "js-fps-monitor")
register(KeyMonitor, "js-key-monitor")
register(SwipeHandler, "js-swipe-handler")
register(LoadingIndicator, "js-loading-indicator")
