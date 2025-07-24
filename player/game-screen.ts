import type { Context } from "@kt3k/cell"
import { gameloop } from "@kt3k/gameloop"
import { Input } from "../util/dir.ts"
import * as signal from "../util/signal.ts"
import { ceilN, floorN, modulo } from "../util/math.ts"
import { BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"
import {
  type CollisionChecker,
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
import { RectScope } from "../util/rect-scope.ts"

/**
 * The area which is visible to the user
 * The center of this area is the center of the screen
 * The center of this area usually follows the 'me' character
 */
class ViewScope extends RectScope {}

/** The items on the field */
class FieldItems implements ILoader, ItemContainer {
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
    // some items might need updates in the future
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
/** A map that counts characters at each coordinate
 * TODO(kt3k): move to util and write tests for this class
 */
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
}

/**
 * The characters who step (evaluates) in each frame
 */
class Actors implements IStepper, ILoader {
  #actors: IChar[] = []
  #coordCountMap = new CoordCountMap()
  #activateScope: RectScope
  #idSet: Set<string>

  checkCollision(i: number, j: number) {
    return this.#coordCountMap.get(`${i}.${j}`) > 0
  }

  constructor(chars: IChar[] = [], activateScope: RectScope) {
    this.#actors = chars
    this.#activateScope = activateScope
    this.#idSet = new Set(chars.map((c) => c.id))
    for (const walker of chars) {
      this.#coordCountMap.increment(walker.physicalGridKey)
    }
  }

  add(walker: IChar) {
    this.#actors.push(walker)
    this.#idSet.add(walker.id)
  }

  step(
    input: typeof Input,
    fieldTester: IFieldTester,
    collisionChecker: CollisionChecker,
    items: ItemContainer,
  ) {
    for (const walker of this.#actors) {
      this.#coordCountMap.decrement(walker.physicalGridKey)
      walker.step(input, fieldTester, collisionChecker, items)
      this.#coordCountMap.increment(walker.physicalGridKey)
    }
  }

  async loadAssets(): Promise<void> {
    await Promise.all(
      this.#actors
        .filter((w) => !w.assetsReady)
        .map((w) => w.loadAssets()),
    )
  }

  get assetsReady(): boolean {
    return this.#actors.every((x) => x.assetsReady)
  }

  checkDeactivate(i: number, j: number) {
    this.#activateScope.setCenter(CELL_SIZE * i, CELL_SIZE * j)
    const actors = [] as IChar[]
    for (const actor of this.#actors) {
      if (this.#activateScope.overlaps(actor)) {
        actors.push(actor)
        continue
      }
      console.log("deactivating actor", actor.id)
      this.#idSet.delete(actor.id)
    }
    this.#actors = actors
  }

  [Symbol.iterator]() {
    return this.#actors[Symbol.iterator]()
  }

  has(id: string) {
    return this.#idSet.has(id)
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
    return Promise.all(mapIds.map((mapId) => this.loadMap(mapId)))
  }

  async loadMap(mapId: string) {
    const url = new URL(`block_${mapId}.json`, this.#root).href
    this.#loading.add(url)
    try {
      const resp = await fetch(url)
      return new BlockMap(url, await resp.json())
    } catch {
      const fallbackUrl = new URL("block_not_found.json", this.#root).href
      const resp = await fetch(fallbackUrl)
      const obj = await resp.json()
      // Fix the map grid coordinates
      const [i, j] = mapId.split(".").map(Number) // mapId is in the form "i.j"
      return new BlockMap(fallbackUrl, Object.assign(obj, { i, j }))
    } finally {
      // ensure the loading is removed even if an error occurs
      this.#loading.delete(url)
    }
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
  #activateScope: RectScope
  #mapLoader = new BlockMapLoader(new URL("map/", location.href).href)
  #initialBlocksLoaded = false

  constructor(el: HTMLElement, activateScope: RectScope) {
    this.#el = el
    this.#activateScope = activateScope
  }

  async addDistrict(block: FieldBlock) {
    console.log("adding district i", block.i, "j", block.j, "id", block.id)
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

  /**
   * Gets the cell for the given grid coordinate
   * Mainly used by characters to get the cell they are trying to enter
   */
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

  async checkBlockLoad(i: number, j: number) {
    this.#loadScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
    const blockIdsToLoad = this.#loadScope.blockIds().filter((id) =>
      !this.hasBlock(id)
    )
    for (const map of await this.#mapLoader.loadMaps(blockIdsToLoad)) {
      this.addDistrict(new FieldBlock(map, loadImage))
    }
    const promises = [] as Promise<void>[]
    for (const block of this) {
      promises.push(
        block.renderNeighborhood(i, j, {
          initialLoad: !this.#initialBlocksLoaded,
        }),
      )
    }
    await Promise.all(promises)
    if (!this.#initialBlocksLoaded) {
      this.#initialBlocksLoaded = true
    }
  }

  checkBlockUnload(i: number, j: number) {
    this.#unloadScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
    for (const block of this) {
      if (!this.#unloadScope.overlaps(block)) {
        console.log("unloading block", block.id)
        this.removeBlock(block)
      }
    }
  }

  checkObjectActivation(i: number, j: number) {
    // TODO(kt3k): implement this
  }

  get assetsReady() {
    return this.#initialBlocksLoaded
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

  const me = new MainCharacter(2, 2, "char/kimi/", "kimi", "down")
  signal.centerPixel.update({ x: me.centerX, y: me.centerY })

  const mobs: IChar[] = range(6).map((j) =>
    range(3).map((i) =>
      new RandomWalkNPC(-4 + i, -2 + j, "char/joob/", `${i}-${j}`)
    )
  ).flat()

  mobs.push(
    new StaticNPC(4, 2, "char/joob/", Math.random() + "", "up"),
    new StaticNPC(5, 2, "char/joob/", Math.random() + "", "up"),
    new StaticNPC(7, 4, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(8, 4, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(11, -2, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(12, -2, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(13, -2, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(11, -3, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(12, -3, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(13, -3, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(11, -4, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(12, -4, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(13, -4, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(12, -5, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(13, -5, "char/joob/", Math.random() + "", "down"),
    new StaticNPC(13, -6, "char/joob/", Math.random() + "", "down"),
  )

  const items = new FieldItems()
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

  const itemLayer = new DrawLayer(itemCanvas, viewScope)
  const charLayer = new DrawLayer(charCanvas, viewScope, { enableNoise: true })

  const activateScope = new ActivateScope(screenSize)

  const actors = new Actors([me, ...mobs], activateScope)
  const field = new Field(query(".field")!, activateScope)

  signal.centerGrid10.subscribe(({ i, j }) => {
    field.checkBlockLoad(i, j)
    field.checkBlockUnload(i, j)
  })

  signal.centerPixel.subscribe(({ x, y }) => {
    viewScope.setCenter(x, y)
    field.translateElement(-viewScope.left, -viewScope.top)
  })

  actors.loadAssets()
  items.loadAssets()

  signal.isGameLoading.subscribe((v) => {
    if (!v) {
      query(".curtain")!.style.opacity = "0"
    }
  })

  const collisionChecker = (i: number, j: number) => actors.checkCollision(i, j)

  let i = 0

  const loop = gameloop(() => {
    i++
    if (!actors.assetsReady || !field.assetsReady || !items.assetsReady) {
      signal.isGameLoading.update(true)
      return
    }
    signal.isGameLoading.update(false)

    actors.step(Input, field, collisionChecker, items)
    items.step() // currently, this is a no-op
    signal.centerPixel.update({ x: me.centerX, y: me.centerY })

    itemLayer.drawIterable(items)
    charLayer.drawIterable(actors)

    if (i % 60 === 0) {
      actors.checkDeactivate(me.i, me.j)
    }
  }, 60)
  loop.onStep((fps) => signal.fps.update(fps))
  loop.run()
}
