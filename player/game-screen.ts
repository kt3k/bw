import type { Context } from "@kt3k/cell"
import { gameloop } from "@kt3k/gameloop"
import { Input } from "../util/dir.ts"
import {
  centerGrid10Signal,
  centerGridSignal,
  centerPixelSignal,
  fpsSignal,
  isLoadingSignal,
  viewScopeSignal,
} from "../util/signal.ts"
import { ceilN, floorN, modulo } from "../util/math.ts"
import { BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"
import {
  type CollisionChecker,
  type IBox,
  type IChar,
  type IFieldTester,
  type ILoader,
  type IObj,
  type IStepper,
  type ItemContainer,
  MainCharacter,
  RandomWalkNPC,
  StaticNPC,
} from "../model/character.ts"
import { BlockMap, FieldBlock } from "../model/field-block.ts"
import { Item } from "../model/item.ts"
import { loadImage } from "../util/load.ts"
import { DrawLayer } from "./draw-layer.ts"

const toEven = (n: number) => floorN(n, 2)
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
    this.#w = toEven(w)
    this.#h = toEven(h)
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

class Items implements ILoader, ItemContainer {
  #items: Set<IObj> = new Set()
  #coordMap = {} as Record<string, IObj>

  add(item: IObj) {
    this.#items.add(item)
    this.#coordMap[`${item.i}.${item.j}`] = item
  }

  get(i: number, j: number): IObj | undefined {
    return this.#coordMap[`${i}.${j}`]
  }

  remove(i: number, j: number) {
    const key = `${i}.${j}`
    const item = this.#coordMap[key]
    if (!item) {
      return
    }
    this.#items.delete(item)
    delete this.#coordMap[key]
  }

  step() {
    // add or remove items based on some scope
  }

  async loadAssets(): Promise<void> {
    await Promise.all(
      [...this.#items]
        .filter((item) => !item.assetsReady)
        .map((item) => item.loadAssets()),
    )
  }

  get assetsReady(): boolean {
    return [...this.#items].every((x) => x.assetsReady)
  }

  [Symbol.iterator]() {
    return this.#items[Symbol.iterator]()
  }
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
class Walkers implements IStepper, ILoader {
  #walkers: IChar[] = []
  #coordCountMap = new CoordCountMap()

  checkCollision(i: number, j: number) {
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

  step(
    input: typeof Input,
    fieldTester: IFieldTester,
    collisionChecker: CollisionChecker,
    items: ItemContainer,
  ) {
    for (const walker of this.#walkers) {
      this.#coordCountMap.decrement(walker.physicalGridKey)
      walker.step(input, fieldTester, collisionChecker, items)
      this.#coordCountMap.increment(walker.physicalGridKey)
    }
  }

  async loadAssets(): Promise<void> {
    await Promise.all(
      this.#walkers
        .filter((w) => !w.assetsReady)
        .map((w) => w.loadAssets()),
    )
  }

  get assetsReady(): boolean {
    return this.#walkers.every((x) => x.assetsReady)
  }

  [Symbol.iterator]() {
    return this.#walkers[Symbol.iterator]()
  }
}

/**
 * When the chunk of {@linkcode FieldBlock} overlaps with this scope,
 * the {@linkcode Character}s in that chunk start walking.
 */
class ActivateScope extends RectScope {
  static MARGIN = 20 * CELL_SIZE
  constructor(screenSize: number) {
    super(screenSize + ActivateScope.MARGIN, screenSize + ActivateScope.MARGIN)
  }
}

/**
 * The scope to load the field block. The field block belong
 * to this area need to be loaded.
 */
class BlockLoadScope extends RectScope {
  static LOAD_UNIT = 200 * CELL_SIZE

  constructor() {
    super(BlockLoadScope.LOAD_UNIT, BlockLoadScope.LOAD_UNIT)
  }

  blockIds(): string[] {
    const { LOAD_UNIT } = BlockLoadScope
    const left = floorN(this.left, BlockLoadScope.LOAD_UNIT)
    const right = ceilN(this.right, BlockLoadScope.LOAD_UNIT)
    const top = floorN(this.top, BlockLoadScope.LOAD_UNIT)
    const bottom = ceilN(this.bottom, BlockLoadScope.LOAD_UNIT)
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
 * The scope to unload the field block. The field block which
 * doesn't belong to this scope need to be unloaded
 */
class BlockUnloadScope extends RectScope {
  static UNLOAD_UNIT = 200 * CELL_SIZE
  constructor() {
    super(BlockUnloadScope.UNLOAD_UNIT, BlockUnloadScope.UNLOAD_UNIT)
  }
}
class Field implements IFieldTester {
  #el: HTMLElement
  #blocks: Record<string, FieldBlock> = {}
  #blockElements: Record<string, HTMLCanvasElement> = {}
  #loadScope = new BlockLoadScope()
  #unloadScope = new BlockUnloadScope()
  #mapLoader = new BlockMapLoader(new URL("map/", location.href).href)

  constructor(el: HTMLElement) {
    this.#el = el
  }

  async addDistrict(block: FieldBlock) {
    this.#blocks[block.id] = block
    const canvas = block.canvas
    this.#blockElements[block.id] = canvas
    this.#el.appendChild(canvas)
    await block.loadAssets()
  }

  removeBlock(block: FieldBlock) {
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
      this.addDistrict(new FieldBlock(map, loadImage))
    }
    for (const block of this) {
      block.renderNeighborhood(i, j)
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
    return !this.#mapLoader.isLoading &&
      Object.values(this.#blocks).every((block) => block.assetsReady)
  }
}

const range = (n: number) => [...Array(n).keys()]

export function GameScreen({ el, query }: Context) {
  const charCanvas = query<HTMLCanvasElement>(".canvas-chars")!
  const itemCanvas = query<HTMLCanvasElement>(".canvas-items")!

  const screenSize = Math.min(globalThis.screen.width, 450)

  charCanvas.width = screenSize
  charCanvas.height = screenSize
  itemCanvas.width = screenSize
  itemCanvas.height = screenSize
  el.style.width = screenSize + "px"
  el.style.height = screenSize + "px"

  const me = new MainCharacter(2, 2, "char/kimi/")
  centerPixelSignal.update({ x: me.centerX, y: me.centerY })

  const mobs: IChar[] = range(6).map((j) =>
    range(3).map((i) => new RandomWalkNPC(-4 + i, -2 + j, "char/joob/"))
  ).flat()

  mobs.push(
    new StaticNPC(4, 2, "char/joob/", "up"),
    new StaticNPC(5, 2, "char/joob/", "up"),
    new StaticNPC(7, 4, "char/joob/", "down"),
    new StaticNPC(8, 4, "char/joob/", "down"),
    new StaticNPC(11, -2, "char/joob/", "down"),
    new StaticNPC(12, -2, "char/joob/", "down"),
    new StaticNPC(13, -2, "char/joob/", "down"),
    new StaticNPC(11, -3, "char/joob/", "down"),
    new StaticNPC(12, -3, "char/joob/", "down"),
    new StaticNPC(13, -3, "char/joob/", "down"),
    new StaticNPC(11, -4, "char/joob/", "down"),
    new StaticNPC(12, -4, "char/joob/", "down"),
    new StaticNPC(13, -4, "char/joob/", "down"),
    new StaticNPC(12, -5, "char/joob/", "down"),
    new StaticNPC(13, -5, "char/joob/", "down"),
    new StaticNPC(13, -6, "char/joob/", "down"),
  )

  const items = new Items()
  items.add(new Item(1, 1, "item/apple.png"))
  items.add(new Item(2, 4, "item/apple.png"))
  items.add(new Item(3, 5, "item/apple.png"))
  items.add(new Item(4, 1, "item/apple.png"))
  items.add(new Item(5, 1, "item/apple.png"))
  items.add(new Item(6, 1, "item/apple.png"))
  items.add(new Item(7, 1, "item/apple.png"))

  items.add(new Item(-1, -5, "item/apple.png"))
  items.add(new Item(-1, -6, "item/apple.png"))
  items.add(new Item(-2, -5, "item/apple.png"))
  items.add(new Item(-2, -6, "item/apple.png"))

  items.add(new Item(-3, 6, "item/apple.png"))
  items.add(new Item(-4, 6, "item/apple.png"))
  items.add(new Item(-5, 6, "item/apple.png"))
  items.add(new Item(-6, 6, "item/apple.png"))

  items.add(new Item(-3, 7, "item/apple.png"))
  items.add(new Item(-4, 7, "item/apple.png"))
  items.add(new Item(-5, 7, "item/apple.png"))
  items.add(new Item(-6, 7, "item/apple.png"))

  items.add(new Item(-3, 8, "item/apple.png"))
  items.add(new Item(-4, 8, "item/apple.png"))
  items.add(new Item(-5, 8, "item/apple.png"))
  items.add(new Item(-6, 8, "item/apple.png"))

  items.add(new Item(-7, 1, "item/apple.png"))

  const viewScope = new ViewScope(screenSize, screenSize)
  centerPixelSignal.subscribe(({ x, y }) => viewScope.setCenter(x, y))

  const charLayer = new DrawLayer(charCanvas, viewScope)
  const itemLayer = new DrawLayer(itemCanvas, viewScope)

  const walkers = new Walkers([me, ...mobs])

  const activateScope = new ActivateScope(screenSize)
  centerGridSignal.subscribe(({ i, j }) =>
    activateScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
  )

  const field = new Field(query(".field")!)
  centerGrid10Signal.subscribe(({ i, j }) => field.checkLoad(i, j))
  centerGrid10Signal.subscribe(({ i, j }) => field.checkUnload(i, j))
  viewScopeSignal.subscribe(({ x, y }) => field.translateElement(x, y))

  walkers.loadAssets()
  items.loadAssets()

  isLoadingSignal.subscribe((v) => {
    if (!v) {
      query(".curtain")!.style.opacity = "0"
    }
  })

  const collisionChecker = (i: number, j: number) =>
    walkers.checkCollision(i, j)

  const loop = gameloop(() => {
    if (!walkers.assetsReady || !field.assetsReady || !items.assetsReady) {
      isLoadingSignal.update(true)
      return
    }
    isLoadingSignal.update(false)

    walkers.step(Input, field, collisionChecker, items)
    centerPixelSignal.update({ x: me.centerX, y: me.centerY })

    itemLayer.clear()
    for (const item of items) {
      if (viewScope.overlaps(item)) {
        itemLayer.draw(item)
      }
    }

    charLayer.clear()
    for (const walker of walkers) {
      if (viewScope.overlaps(walker)) {
        charLayer.draw(walker)
      }
    }
  }, 60)
  loop.onStep((fps) => fpsSignal.update(fps))
  loop.run()
}
