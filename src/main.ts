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
import { ceilN, floorN, modulo } from "./util/math.ts"

const CELL_UNIT = 16

const DISTRICT_SIZE = 200

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
abstract class RectScope {
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

  includes(char: IBox): boolean {
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
class ViewScope extends RectScope {
  override setCenter(x: number, y: number): void {
    super.setCenter(x, y)
    viewScopeSignal.updateByFields({ x: -this.left, y: -this.top })
  }
}

/** The interface represents a box */
type IBox = {
  get x(): number
  get y(): number
  get w(): number
  get h(): number
}

/** The interface represents a character */
type IChar = IBox & {
  step(input: typeof Input, terrain: Terrain): void
  image(): HTMLImageElement
  get assetsReady(): boolean
}

/**
 * The characters who can walk,
 * i.e. the characters who are evaluated in each frame
 */
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
class WalkScope extends RectScope {
}

/**
 * The scope to load the terrain district. The terrain district belong
 * to this area need to be loaded.
 */
export class LoadScope extends RectScope {
  static LOAD_UNIT = 200 * CELL_UNIT

  #loading = new Set()

  constructor() {
    super(LoadScope.LOAD_UNIT, LoadScope.LOAD_UNIT)
  }

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
    const left = floorN(this.left, LoadScope.LOAD_UNIT)
    const right = ceilN(this.right, LoadScope.LOAD_UNIT)
    const top = floorN(this.top, LoadScope.LOAD_UNIT)
    const bottom = ceilN(this.bottom, LoadScope.LOAD_UNIT)
    const list = [] as MapId[]
    for (let x = left; x < right; x += LOAD_UNIT) {
      for (let y = top; y < bottom; y += LOAD_UNIT) {
        const i = x / CELL_UNIT
        const j = y / CELL_UNIT
        list.push([i, j])
      }
    }
    console.log(list)
    return list
  }
}

/**
 * The scope to unload the terrain fragment. The terrain fragment which
 * doesn't belong to this scope need to be unloaded
 */
class UnloadScope extends RectScope {
  static UNLOAD_UNIT = 300 * CELL_UNIT
  constructor() {
    super(UnloadScope.UNLOAD_UNIT, UnloadScope.UNLOAD_UNIT)
  }
}

/** Item represents the item in the terrain */
class Item {}

type MapId = [k: number, l: number]

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

/**
 * TerrainCell represents the cell in the terrain district
 */
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

class TerrainDistrict {
  #x: number
  #y: number
  #w: number
  #h: number
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
    this.#x = this.#i * CELL_UNIT
    this.#y = this.#j * CELL_UNIT
    this.#h = DISTRICT_SIZE * CELL_UNIT
    this.#w = DISTRICT_SIZE * CELL_UNIT
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

  get id() {
    return `${this.#i}.${this.#j}`
  }

  createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas")
    canvas.style.position = "absolute"
    canvas.style.left = `${this.x}px`
    canvas.style.top = `${this.y}px`
    canvas.width = this.w
    canvas.height = this.h
    const ctx = canvas.getContext("2d")!
    renderDistrict(new Brush(ctx), this)
    return canvas
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
  get x() {
    return this.#x
  }
  get y() {
    return this.#y
  }
  get h() {
    return this.#h
  }
  get w() {
    return this.#w
  }
}

function renderDistrict(brush: Brush, district: TerrainDistrict) {
  for (let j = 0; j < DISTRICT_SIZE; j++) {
    for (let i = 0; i < DISTRICT_SIZE; i++) {
      const cell = district.get(i, j)
      brush.ctx.fillStyle = cell.color || "black"
      brush.ctx.fillRect(i * CELL_UNIT, j * CELL_UNIT, CELL_UNIT, CELL_UNIT)
    }
  }
}

class Terrain {
  #el: HTMLElement
  #districts: Record<string, TerrainDistrict> = {}
  #districtElements: Record<string, HTMLCanvasElement> = {}

  constructor(el: HTMLElement) {
    this.#el = el
  }

  addDistrict(district: TerrainDistrict) {
    this.#districts[district.id] = district
    const canvas = district.createCanvas()
    this.#districtElements[district.id] = canvas
    this.#el.appendChild(canvas)
  }

  removeDistrict(district: TerrainDistrict) {
    delete this.#districts[district.id]
    this.#el.removeChild(this.#districtElements[district.id])
    delete this.#districtElements[district.id]
  }

  get(i: number, j: number) {
    const k = floorN(i, DISTRICT_SIZE)
    const l = floorN(j, DISTRICT_SIZE)
    return this.#districts[`${k}.${l}`].get(
      modulo(i, DISTRICT_SIZE),
      modulo(j, DISTRICT_SIZE),
    )
  }

  hasDistrict(i: number, j: number) {
    return !!this.#districts[`${i}.${j}`]
  }

  [Symbol.iterator]() {
    return Object.values(this.#districts)[Symbol.iterator]()
  }
}

async function GameScreen({ query }: Context) {
  const canvas1 = query<HTMLCanvasElement>(".canvas1")!
  const brush = new Brush(canvas1.getContext("2d")!)

  const me = new Character(2, 2, 1, "char/juni/juni_")

  const viewScope = new ViewScope(canvas1.width, canvas1.height)
  viewScope.setCenter(me.centerX, me.centerY)

  const loadScope = new LoadScope()
  loadScope.setCenter(me.centerX, me.centerY)

  const unloadScope = new UnloadScope()
  unloadScope.setCenter(me.centerX, me.centerY)

  const walkScope = new WalkScope(canvas1.width * 3, canvas1.height * 3)
  walkScope.setCenter(me.centerX, me.centerY)

  globalThis.addEventListener("blur", () => {
    clearInput()
  })

  const walkers = new Walkers()
  walkers.add(me)

  const terrainEl = query(".terrain")!
  const terrain = new Terrain(terrainEl)
  const mapIdsToLoad = loadScope.mapIds().filter(([k, l]) =>
    !terrain.hasDistrict(k, l)
  )

  for (const map of await loadScope.loadMaps(mapIdsToLoad)) {
    terrain.addDistrict(new TerrainDistrict(map))
  }

  viewScopeSignal.subscribe(({ x, y }) => {
    terrainEl.style.transform = `translateX(${x}px) translateY(${y}px`
  })

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
    unloadScope.setCenter(me.centerX, me.centerY)

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
