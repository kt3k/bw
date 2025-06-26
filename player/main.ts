import { type Context, register } from "@kt3k/cell"
import { gameloop } from "@kt3k/gameloop"
import { clearInput, Input } from "../util/dir.ts"
import { KeyMonitor } from "./ui/key-monitor.ts"
import { FpsMonitor } from "./ui/fps-monitor.ts"
import { SwipeHandler } from "./ui/swipe-handler.ts"
import {
  centerGrid10Signal,
  centerGridSignal,
  centerPixelSignal,
  fpsSignal,
  isLoadingSignal,
  viewScopeSignal,
} from "../util/signal.ts"
import { LoadingIndicator } from "./ui/loading-indicator.ts"
import { CanvasLayer } from "../util/canvas-layer.ts"
import { ceilN, floorN, modulo } from "../util/math.ts"
import { BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"
import {
  BlockMap,
  type CollisionChecker,
  MainCharacter,
  NPC,
  TerrainBlock,
} from "./model/models.ts"
import { loadImage } from "../util/load.ts"
import { AppleCounter } from "./ui/apple-counter.ts"

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
  step(
    input: typeof Input,
    terrain: Terrain,
    collisionChecker: CollisionChecker,
  ): void
  image(): HTMLImageElement
  get assetsReady(): boolean
  get physicalGridKey(): string
}

/** A map that counts characters at each coordinate */
class CoordCountMap {
  #map: Record<string, number> = {}

  increment(key: string, value = 1) {
    if (this.#map[key] === undefined) {
      this.#map[key] = 0
    }
    this.#map[key] += value
  }

  decrement(key: string, value = 1) {
    if (this.#map[key] === undefined) {
      return
    }
    this.#map[key] -= value
    if (this.#map[key] <= 0) {
      delete this.#map[key]
    }
  }

  get(key: string): number {
    return this.#map[key] ?? 0
  }

  display() {
    Object.entries(this.#map).forEach(([key, value]) => {
      console.log(`${key}=${value}`)
    })
  }
}

/**
 * The characters who can walk,
 * i.e. the characters who are evaluated in each frame
 */
class Walkers {
  #walkers: IChar[] = []
  #coordCountMap = new CoordCountMap()

  checkCollision = (i: number, j: number): boolean => {
    return this.#coordCountMap.get(`${i}.${j}`) > 0
  }

  constructor(chars: IChar[] = []) {
    this.#walkers = chars
    for (const walker of chars) {
      this.#coordCountMap.increment(walker.physicalGridKey)
    }
  }

  add(walker: IChar) {
    this.#walkers.push(walker)
  }

  step(input: typeof Input, terrain: Terrain) {
    for (const walker of this.#walkers) {
      this.#coordCountMap.decrement(walker.physicalGridKey)
      walker.step(input, terrain, this.checkCollision)
      this.#coordCountMap.increment(walker.physicalGridKey)
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
 * The scope to load the terrain block. The terrain block belong
 * to this area need to be loaded.
 */
class LoadScope extends RectScope {
  static LOAD_UNIT = 200 * CELL_SIZE

  constructor() {
    super(LoadScope.LOAD_UNIT, LoadScope.LOAD_UNIT)
  }

  blockIds(): string[] {
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

/** MapLoader manages the loading of maps */
class BlockMapLoader {
  #loading = new Set<string>()
  #root: string

  constructor(root: string) {
    this.#root = root
  }

  loadMaps(mapIds: string[]) {
    const maps = mapIds.map((mapId) =>
      new URL(`block_${mapId}.json`, this.#root).href
    )
    return Promise.all(maps.map((map) => this.loadMap(map)))
  }

  async loadMap(url: string) {
    this.#loading.add(url)
    const resp = await fetch(url)
    const map = new BlockMap(url, await resp.json())
    this.#loading.delete(url)
    return map
  }

  get isLoading() {
    return this.#loading.size > 0
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
class Terrain {
  #el: HTMLElement
  #blocks: Record<string, TerrainBlock> = {}
  #blockElements: Record<string, HTMLCanvasElement> = {}
  #loadScope = new LoadScope()
  #unloadScope = new UnloadScope()
  #mapLoader = new BlockMapLoader(new URL("map/", location.href).href)

  constructor(el: HTMLElement) {
    this.#el = el
  }

  async addDistrict(block: TerrainBlock) {
    this.#blocks[block.id] = block
    await block.loadAssets()
    const canvas = block.createCanvas()
    this.#blockElements[block.id] = canvas
    this.#el.appendChild(canvas)
  }

  removeBlock(block: TerrainBlock) {
    delete this.#blocks[block.id]
    this.#el.removeChild(this.#blockElements[block.id])
    delete this.#blockElements[block.id]
  }

  get(i: number, j: number) {
    const k = floorN(i, BLOCK_SIZE)
    const l = floorN(j, BLOCK_SIZE)
    return this.#blocks[`${k}.${l}`].get(
      modulo(i, BLOCK_SIZE),
      modulo(j, BLOCK_SIZE),
    )
  }

  hasBlock(blockId: string) {
    return !!this.#blocks[blockId]
  }

  [Symbol.iterator]() {
    return Object.values(this.#blocks)[Symbol.iterator]()
  }

  translateElement(x: number, y: number) {
    this.#el.style.transform = `translateX(${x}px) translateY(${y}px)`
  }

  async checkLoad(i: number, j: number) {
    this.#loadScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
    const blockIdsToLoad = this.#loadScope.blockIds().filter((id) =>
      !this.hasBlock(id)
    )
    for (const map of await this.#mapLoader.loadMaps(blockIdsToLoad)) {
      this.addDistrict(new TerrainBlock(map, loadImage))
    }
  }

  checkUnload(i: number, j: number) {
    this.#unloadScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
    for (const block of this) {
      if (!this.#unloadScope.overlaps(block)) {
        this.removeBlock(block)
      }
    }
  }

  get assetsReady() {
    return !this.#mapLoader.isLoading
  }
}

const range = (n: number) => [...Array(n).keys()]

function GameScreen({ query }: Context) {
  const layer = new CanvasLayer(query<HTMLCanvasElement>(".canvas1")!)

  const me = new MainCharacter(2, 2, 1, "char/kimi/")
  centerPixelSignal.update({ x: me.centerX, y: me.centerY })

  const mobs = range(6).map((j) =>
    range(3).map((i) => new NPC(-4 + i, -2 + j, 1, "char/joob/"))
  ).flat()

  const viewScope = new ViewScope(layer.width, layer.height)
  centerPixelSignal.subscribe(({ x, y }) => viewScope.setCenter(x, y))

  const walkers = new Walkers([me, ...mobs])

  const walkScope = new WalkScope(layer.width * 3, layer.height * 3)
  centerGridSignal.subscribe(({ i, j }) =>
    walkScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
  )

  const terrain = new Terrain(query(".terrain")!)
  centerGrid10Signal.subscribe(({ i, j }) => terrain.checkLoad(i, j))
  centerGrid10Signal.subscribe(({ i, j }) => terrain.checkUnload(i, j))
  viewScopeSignal.subscribe(({ x, y }) => terrain.translateElement(x, y))

  me.loadAssets()
  mobs.forEach((mob) => mob.loadAssets())

  isLoadingSignal.subscribe((v) => {
    if (!v) {
      query(".curtain")!.style.opacity = "0"
    }
  })

  const loop = gameloop(() => {
    if (!walkers.assetsReady || !terrain.assetsReady) {
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
register(AppleCounter, "js-apple-counter")
