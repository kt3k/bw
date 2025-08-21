import type { Context } from "@kt3k/cell"
import { Gameloop } from "@kt3k/gameloop"
import * as signal from "../util/signal.ts"
import { ceilN, floorN, modulo } from "../util/math.ts"
import { BLOCK_CHUNK_SIZE, BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"
import {
  type CollisionChecker,
  type IChar,
  type IFieldTester,
  type IItem,
  type ILoader,
  type IStepper,
  type ItemContainer,
  spawnCharacter,
} from "../model/character.ts"
import { MainCharacter } from "./main-character.ts"
import {
  BlockMap,
  FieldBlock,
  type FieldBlockChunk,
  type FieldCell,
} from "../model/field-block.ts"
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
  #items: Set<IItem> = new Set()
  #coordMap = {} as Record<string, IItem>
  #activateScope: RectScope

  constructor(scope: RectScope) {
    this.#activateScope = scope
  }

  checkDeactivate(i: number, j: number) {
    this.#activateScope.setCenter(CELL_SIZE * i, CELL_SIZE * j)
    this.#items.values()
      .filter((item) => !this.#activateScope.overlaps(item))
      .forEach((item) => {
        console.log("deactivating item", item.id)
        this.#deactivate(item.i, item.j)
      })
    signal.itemsCount.update(this.#items.size)
  }

  add(item: IItem) {
    this.#items.add(item)
    this.#coordMap[`${item.i}.${item.j}`] = item
    signal.itemsCount.update(this.#items.size)
  }

  isCollected(id: string) {
    return Item.isCollected(id)
  }

  get(i: number, j: number): IItem | undefined {
    return this.#coordMap[`${i}.${j}`]
  }

  /** Collects an item from the field. */
  collect(i: number, j: number) {
    const item = this.#deactivate(i, j)
    if (item?.id) {
      Item.collect(item.id)
    }
  }

  /**
   * Removes an item from the field.
   * The item can be re-spawned later.
   */
  #deactivate(i: number, j: number): IItem | undefined {
    const key = `${i}.${j}`
    const item = this.#coordMap[key]
    if (!item) {
      return
    }
    this.#items.delete(item)
    delete this.#coordMap[key]
    signal.itemsCount.update(this.#items.size)
    return item
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
  #idSet: Set<string> = new Set()

  checkCollision(i: number, j: number) {
    return this.#coordCountMap.get(`${i}.${j}`) > 0
  }

  constructor(chars: IChar[] = [], activateScope: RectScope) {
    this.#activateScope = activateScope
    for (const actor of chars) {
      this.add(actor)
    }
  }

  add(actor: IChar) {
    this.#actors.push(actor)
    this.#idSet.add(actor.id)
    this.#coordCountMap.increment(actor.physicalGridKey)
    signal.actorsCount.update(this.#actors.length)
  }

  step(
    fieldTester: IFieldTester,
    collisionChecker: CollisionChecker,
    items: ItemContainer,
  ) {
    for (const actor of this.#actors) {
      this.#coordCountMap.decrement(actor.physicalGridKey)
      actor.step(fieldTester, collisionChecker, items)
      this.#coordCountMap.increment(actor.physicalGridKey)
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
      this.#coordCountMap.decrement(actor.physicalGridKey)
    }
    this.#actors = actors
    signal.actorsCount.update(this.#actors.length)
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
  #initialActivateReady = false

  constructor(el: HTMLElement, activateScope: RectScope) {
    this.#el = el
    this.#activateScope = activateScope
  }

  async #addBlock(block: FieldBlock) {
    console.log("adding district i", block.i, "j", block.j, "id", block.id)
    this.#blocks[block.id] = block
    const canvas = block.canvas
    this.#blockElements[block.id] = canvas
    this.#el.appendChild(canvas)
    await block.loadAssets()
  }

  #removeBlock(block: FieldBlock) {
    delete this.#blocks[block.id]
    this.#el.removeChild(this.#blockElements[block.id])
    delete this.#blockElements[block.id]
  }

  #getBlock(i: number, j: number): FieldBlock {
    const i_ = floorN(i, BLOCK_SIZE)
    const j_ = floorN(j, BLOCK_SIZE)
    const block = this.#blocks[`${i_}.${j_}`]
    if (!block) {
      console.error(`Unable to get block at ${i_}, ${j_}`)
      throw Error("Block not found")
    }
    return block
  }

  /**
   * Gets the cell for the given grid coordinate
   * Mainly used by characters to get the cell they are trying to enter
   */
  get(i: number, j: number): FieldCell {
    return this.#getBlock(i, j).getCell(
      modulo(i, BLOCK_SIZE),
      modulo(j, BLOCK_SIZE),
    )
  }

  #hasBlock(blockId: string) {
    return !!this.#blocks[blockId]
  }

  translateElement(x: number, y: number) {
    this.#el.style.transform = `translateX(${x}px) translateY(${y}px)`
  }

  async checkBlockLoad(
    i: number,
    j: number,
    viewScope: ViewScope,
    actors: Actors,
    items: FieldItems,
  ) {
    this.#loadScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
    const blockIdsToLoad = this.#loadScope.blockIds().filter((id) =>
      !this.#hasBlock(id)
    )
    for (const map of await this.#mapLoader.loadMaps(blockIdsToLoad)) {
      this.#addBlock(new FieldBlock(map, loadImage))
    }
    const initialLoad = !this.#initialBlocksLoaded
    await Promise.all(
      this.#getChunks(i, j).map((c) => c.render(initialLoad)).toArray(),
    )
    if (!this.#initialBlocksLoaded) {
      this.#initialBlocksLoaded = true
      this.checkActivate(
        i,
        j,
        {
          viewScope,
          actors,
          items,
          initialLoad: true,
        },
      ).then(() => {
        console.log("initial actors ready")
        this.#initialActivateReady = true
      })
    }
  }

  checkBlockUnload(i: number, j: number) {
    this.#unloadScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
    for (const block of Object.values(this.#blocks)) {
      if (!this.#unloadScope.overlaps(block)) {
        console.log("unloading block", block.id)
        this.#removeBlock(block)
      }
    }
  }

  async checkActivate(
    i: number,
    j: number,
    { viewScope, actors, items, initialLoad = false }: {
      viewScope: RectScope
      actors: {
        has(id: string): boolean
        add(char: IChar): void
        loadAssets(): Promise<void>
      }
      items: {
        isCollected(id: string): boolean
        get(i: number, j: number): IItem | undefined
        add(item: IItem): void
        loadAssets(): Promise<void>
      }
      initialLoad?: boolean
    },
  ) {
    const chunks = [...this.#getChunks(i, j)]
    const newCharSpawns = chunks.flatMap((c) => c.getCharacterSpawnInfo())
      .filter((spawn) => !actors.has(spawn.id)) // isn't spawned yet
      .filter((spawn) => initialLoad || !viewScope.overlaps(spawn)) // not in view
      .filter((spawn) => this.#activateScope.overlaps(spawn)) // in activate scope

    const newItemSpawns = chunks.flatMap((c) => c.getItemSpawnInfo())
      .filter((spawn) => !items.isCollected(spawn.id)) // isn't collected yet
      .filter((spawn) => !items.get(spawn.i, spawn.j)) // the place isn't occupied by other item
      .filter((spawn) => initialLoad || !viewScope.overlaps(spawn)) // not in view
      .filter((spawn) => this.#activateScope.overlaps(spawn)) // in activate scope

    if (newCharSpawns.length > 0) {
      console.log(`Spawning ${newCharSpawns.length} characters`)
      for (const spawn of newCharSpawns) {
        actors.add(spawnCharacter(
          spawn.id,
          spawn.type,
          spawn.i,
          spawn.j,
          spawn.src,
          {
            dir: spawn.dir,
            speed: spawn.speed,
          },
        ))
      }
      await actors.loadAssets()
    } else if (initialLoad) {
      await actors.loadAssets()
    }

    if (newItemSpawns.length > 0) {
      console.log(`Spawning ${newItemSpawns.length} items`)
      for (const spawn of newItemSpawns) {
        items.add(
          new Item(
            spawn.id,
            spawn.i,
            spawn.j,
            spawn.type,
            spawn.src,
          ),
        )
      }
      await items.loadAssets()
    } else if (initialLoad) {
      await items.loadAssets()
    }
  }

  *#getChunks(i: number, j: number): Generator<FieldBlockChunk> {
    this.#activateScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
    const left = floorN(this.#activateScope.left, CELL_SIZE * BLOCK_CHUNK_SIZE)
    const right = ceilN(
      this.#activateScope.right,
      CELL_SIZE * BLOCK_CHUNK_SIZE,
    )
    const top = floorN(this.#activateScope.top, CELL_SIZE * BLOCK_CHUNK_SIZE)
    const bottom = ceilN(
      this.#activateScope.bottom,
      CELL_SIZE * BLOCK_CHUNK_SIZE,
    )
    for (let x = left; x < right; x += CELL_SIZE * BLOCK_CHUNK_SIZE) {
      for (let y = top; y < bottom; y += CELL_SIZE * BLOCK_CHUNK_SIZE) {
        const i = x / CELL_SIZE
        const j = y / CELL_SIZE
        yield this.#getBlock(i, j).getChunk(i, j)
      }
    }
  }

  get assetsReady() {
    return this.#initialActivateReady
  }
}

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

  const me = new MainCharacter(2, 2, "char/kimi/", "kimi", "down", 1)
  signal.centerPixel.update({ x: me.centerX, y: me.centerY })

  const viewScope = new ViewScope(screenSize, screenSize)

  const itemLayer = new DrawLayer(itemCanvas, viewScope)
  const charLayer = new DrawLayer(charCanvas, viewScope, { enableNoise: true })

  const activateScope = new ActivateScope(screenSize)

  const actors = new Actors([me], activateScope)
  const items = new FieldItems(activateScope)
  const field = new Field(query(".field")!, activateScope)

  signal.centerGrid10.subscribe(({ i, j }) => {
    field.checkBlockLoad(i, j, viewScope, actors, items)
    field.checkBlockUnload(i, j)
  })

  signal.centerPixel.subscribe(({ x, y }) => {
    viewScope.setCenter(x, y)
    field.translateElement(-viewScope.left, -viewScope.top)
  })

  items.loadAssets()

  signal.isGameLoading.subscribe((v) => {
    if (!v) {
      query(".curtain")!.style.opacity = "0"
    }
  })

  const collisionChecker = (i: number, j: number) => actors.checkCollision(i, j)

  let i = 0

  const loop = new Gameloop(60, () => {
    i++
    if (!field.assetsReady) {
      signal.isGameLoading.update(true)
      return
    }
    signal.isGameLoading.update(false)

    actors.step(field, collisionChecker, items)
    items.step() // currently, this is a no-op
    signal.centerPixel.update({ x: me.centerX, y: me.centerY })

    itemLayer.drawIterable(items)
    charLayer.drawIterable(actors)

    if (i % 300 === 299) {
      actors.checkDeactivate(me.i, me.j)
    }
    if (i % 300 === 199) {
      items.checkDeactivate(me.i, me.j)
    }
    if (i % 60 === 59) {
      field.checkActivate(me.i, me.j, { viewScope, actors, items })
    }
  })
  loop.onStep((fps, v) => {
    signal.fps.update(fps)
    if (v > 3000) {
      signal.v.update(3000)
    }
  })
  loop.start()
}
