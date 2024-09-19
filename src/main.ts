import { type Context, register } from "@kt3k/cell"
import { gameloop } from "@kt3k/gameloop"
import { loadImage } from "./util/load.ts"
import { clearInput, Input } from "./util/dir.ts"
import { KeyMonitor } from "./ui/KeyMonitor.ts"
import { FpsMonitor } from "./ui/FpsMonitor.ts"
import { SwipeHandler } from "./ui/SwipeHandler.ts"
import { type Dir, DOWN, LEFT, RIGHT, UP } from "./util/dir.ts"
import {
  centerGrid10Signal,
  centerGridSignal,
  centerPixelSignal,
  fpsSignal,
  isLoadingSignal,
  viewScopeSignal,
} from "./util/signal.ts"
import { LoadingIndicator } from "./ui/LoadingIndicator.ts"
import { CanvasLater } from "./util/brush.ts"
import { ceilN, floorN, modulo } from "./util/math.ts"
import { BLOCK_SIZE, CELL_SIZE } from "./util/constants.ts"

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
      return this.#i * CELL_SIZE - this.#d
    } else if (this.#dir === RIGHT) {
      return this.#i * CELL_SIZE + this.#d
    } else {
      return this.#i * CELL_SIZE
    }
  }

  get centerX() {
    return this.x + CELL_SIZE / 2
  }

  /** Gets the y of the world coordinates */
  get y() {
    if (this.#dir === UP) {
      return this.#j * CELL_SIZE - this.#d
    } else if (this.#dir === DOWN) {
      return this.#j * CELL_SIZE + this.#d
    } else {
      return this.#j * CELL_SIZE
    }
  }

  get h() {
    return CELL_SIZE
  }

  get w() {
    return CELL_SIZE
  }

  get centerY() {
    return this.y + CELL_SIZE / 2
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

  /** The given IBox overlaps with this rectangle scope. */
  overlaps(char: IBox): boolean {
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
    viewScopeSignal.update({ x: -this.left, y: -this.top })
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

  constructor(chars: IChar[] = []) {
    this.#walkers = chars
  }

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
  static LOAD_UNIT = 200 * CELL_SIZE

  #loading = new Set()

  constructor() {
    super(LoadScope.LOAD_UNIT, LoadScope.LOAD_UNIT)
  }

  loadMaps(mapIds: string[]) {
    const maps = mapIds.map((mapId) => `map/map_${mapId}.json`)
    return Promise.all(maps.map((map) => this.#loadMap(map)))
  }

  async #loadMap(url: string) {
    this.#loading.add(url)
    const resp = await fetch(url)
    const map = new Map(await resp.json())
    this.#loading.delete(url)
    return map
  }

  mapIds(): string[] {
    const { LOAD_UNIT } = LoadScope
    const left = floorN(this.left, LoadScope.LOAD_UNIT)
    const right = ceilN(this.right, LoadScope.LOAD_UNIT)
    const top = floorN(this.top, LoadScope.LOAD_UNIT)
    const bottom = ceilN(this.bottom, LoadScope.LOAD_UNIT)
    const list = [] as string[]
    for (let x = left; x < right; x += LOAD_UNIT) {
      for (let y = top; y < bottom; y += LOAD_UNIT) {
        const i = x / CELL_SIZE
        const j = y / CELL_SIZE
        list.push(`${i}.${j}`)
      }
    }
    return list
  }
}

/**
 * The scope to unload the terrain fragment. The terrain fragment which
 * doesn't belong to this scope need to be unloaded
 */
class UnloadScope extends RectScope {
  static UNLOAD_UNIT = 200 * CELL_SIZE
  constructor() {
    super(UnloadScope.UNLOAD_UNIT, UnloadScope.UNLOAD_UNIT)
  }
}

/** Item represents the item in the terrain */
class Item {}

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
    this.#x = this.#i * CELL_SIZE
    this.#y = this.#j * CELL_SIZE
    this.#h = BLOCK_SIZE * CELL_SIZE
    this.#w = BLOCK_SIZE * CELL_SIZE
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
    this.#renderDistrict(new CanvasLater(canvas))
    return canvas
  }

  #renderDistrict(layer: CanvasLater) {
    for (let j = 0; j < BLOCK_SIZE; j++) {
      for (let i = 0; i < BLOCK_SIZE; i++) {
        const cell = this.get(i, j)
        layer.drawRect(
          i * CELL_SIZE,
          j * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE,
          cell.color || "black",
        )
      }
    }
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
    const k = floorN(i, BLOCK_SIZE)
    const l = floorN(j, BLOCK_SIZE)
    return this.#districts[`${k}.${l}`].get(
      modulo(i, BLOCK_SIZE),
      modulo(j, BLOCK_SIZE),
    )
  }

  hasDistrict(mapId: string) {
    return !!this.#districts[mapId]
  }

  [Symbol.iterator]() {
    return Object.values(this.#districts)[Symbol.iterator]()
  }

  translateElement(x: number, y: number) {
    this.#el.style.transform = `translateX(${x}px) translateY(${y}px)`
  }
}

async function GameScreen({ query }: Context) {
  const layer = new CanvasLater(query<HTMLCanvasElement>(".canvas1")!)

  const me = new Character(2, 2, 1, "char/juni/juni_")
  centerPixelSignal.update({ x: me.centerX, y: me.centerY })

  const viewScope = new ViewScope(layer.width, layer.height)
  centerPixelSignal.subscribe(({ x, y }) => viewScope.setCenter(x, y))

  const walkers = new Walkers([me])

  const walkScope = new WalkScope(layer.width * 3, layer.height * 3)
  centerGridSignal.subscribe(({ i, j }) =>
    walkScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
  )

  const terrain = new Terrain(query(".terrain")!)

  const loadScope = new LoadScope()
  centerGrid10Signal.subscribe(async ({ i, j }) => {
    console.log("load check")
    loadScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)

    const mapIdsToLoad = loadScope.mapIds().filter((id) =>
      !terrain.hasDistrict(id)
    )

    for (const map of await loadScope.loadMaps(mapIdsToLoad)) {
      terrain.addDistrict(new TerrainDistrict(map))
    }
  })

  const unloadScope = new UnloadScope()
  centerGrid10Signal.subscribe(({ i, j }) => {
    console.log("unload check")
    unloadScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
    for (const district of terrain) {
      if (!unloadScope.overlaps(district)) {
        terrain.removeDistrict(district)
      }
    }
  })

  viewScopeSignal.subscribe(({ x, y }) => terrain.translateElement(x, y))

  await me.loadAssets()

  const loop = gameloop(() => {
    if (!walkers.assetsReady) {
      isLoadingSignal.update(true)
      return
    }
    isLoadingSignal.update(false)

    walkers.step(Input, terrain)
    centerPixelSignal.update({
      x: me.centerX,
      y: me.centerY,
    })

    layer.clear()

    for (const walker of walkers) {
      if (!viewScope.overlaps(walker)) {
        continue
      }
      layer.drawImage(
        walker.image(),
        walker.x - viewScope.left,
        walker.y - viewScope.top,
      )
    }
  }, 60)
  loop.onStep((fps) => fpsSignal.update(fps))
  loop.run()
}

globalThis.addEventListener("blur", clearInput)

register(GameScreen, "js-game-screen")
register(FpsMonitor, "js-fps-monitor")
register(KeyMonitor, "js-key-monitor")
register(SwipeHandler, "js-swipe-handler")
register(LoadingIndicator, "js-loading-indicator")
