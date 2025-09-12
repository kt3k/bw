import * as signal from "../util/signal.ts"
import { ceilN, floorN } from "../util/math.ts"
import { BLOCK_CHUNK_SIZE, BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"
import type {
  IActor,
  IField,
  IItem,
  ILoader,
  IObject,
  IStepper,
  LoadOptions,
} from "../model/types.ts"
import { spawnCharacter } from "../model/character.ts"
import { Item } from "../model/item.ts"
import { Object } from "../model/object.ts"
import {
  BlockMap,
  FieldBlock,
  type FieldBlockChunk,
  type FieldCell,
} from "../model/field-block.ts"
import { loadImage } from "../util/load.ts"
import { RectScope } from "../util/rect-scope.ts"

/** The items on the field */
export class FieldItems implements IStepper, ILoader {
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

  step(_field: IField) {
    // some items might need updates in the future
  }

  async loadAssets(options: LoadOptions): Promise<void> {
    await Promise.all(
      [...this.#items]
        .filter((item) => !item.assetsReady)
        .map((item) => item.loadAssets(options)),
    )
  }

  get assetsReady(): boolean {
    return [...this.#items].every((x) => x.assetsReady)
  }

  iter() {
    return this.#items[Symbol.iterator]()
  }
}

export class FieldObjects implements IStepper, ILoader {
  #objects: Set<IObject> = new Set()
  #coordMap = {} as Record<string, IObject>
  #activateScope: RectScope

  constructor(scope: RectScope) {
    this.#activateScope = scope
  }

  checkDeactivate(i: number, j: number) {
    this.#activateScope.setCenter(CELL_SIZE * i, CELL_SIZE * j)
    this.#objects.values()
      .filter((obj) => !this.#activateScope.overlaps(obj))
      .forEach((obj) => {
        console.log("deactivating object", obj.id)
        this.#deactivate(obj.i, obj.j)
      })
    signal.objectsCount.update(this.#objects.size)
  }

  add(obj: IObject) {
    this.#objects.add(obj)
    this.#coordMap[`${obj.i}.${obj.j}`] = obj
    signal.objectsCount.update(this.#objects.size)
  }

  get(i: number, j: number): IObject | undefined {
    return this.#coordMap[`${i}.${j}`]
  }

  canEnter(i: number, j: number): boolean {
    const obj = this.get(i, j)
    return obj === undefined || obj.canEnter
  }

  #deactivate(i: number, j: number): IObject | undefined {
    const key = `${i}.${j}`
    const obj = this.#coordMap[key]
    if (!obj) {
      return
    }
    this.#objects.delete(obj)
    delete this.#coordMap[key]
    signal.objectsCount.update(this.#objects.size)
    return obj
  }

  async loadAssets(options: LoadOptions): Promise<void> {
    await Promise.all(
      [...this.#objects]
        .filter((obj) => !obj.assetsReady)
        .map((obj) => obj.loadAssets(options)),
    )
  }

  get assetsReady(): boolean {
    return [...this.#objects].every((x) => x.assetsReady)
  }

  step(_field: IField) {
    // Implement this when there are moving objects
  }

  iter() {
    return this.#objects[Symbol.iterator]()
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
export class FieldActors implements IStepper, ILoader {
  #actors: IActor[] = []
  #coordCountMap = new CoordCountMap()
  #activateScope: RectScope
  #idSet: Set<string> = new Set()

  /**
   * @param i world grid index
   * @param j world grid index
   * @return true if there is a character at the given grid coordinate
   */
  checkCollision(i: number, j: number) {
    return this.#coordCountMap.get(`${i}.${j}`) > 0
  }

  constructor(chars: IActor[] = [], activateScope: RectScope) {
    this.#activateScope = activateScope
    for (const actor of chars) {
      this.add(actor)
    }
  }

  add(actor: IActor) {
    this.#actors.push(actor)
    this.#idSet.add(actor.id)
    this.#coordCountMap.increment(actor.physicalGridKey)
    signal.actorsCount.update(this.#actors.length)
  }

  step(field: IField) {
    for (const actor of this.#actors) {
      this.#coordCountMap.decrement(actor.physicalGridKey)
      actor.step(field)
      this.#coordCountMap.increment(actor.physicalGridKey)
    }
  }

  async loadAssets(options: LoadOptions): Promise<void> {
    await Promise.all(
      this.#actors
        .filter((w) => !w.assetsReady)
        .map((w) => w.loadAssets(options)),
    )
  }

  get assetsReady(): boolean {
    return this.#actors.every((x) => x.assetsReady)
  }

  checkDeactivate(i: number, j: number) {
    this.#activateScope.setCenter(CELL_SIZE * i, CELL_SIZE * j)
    const actors = [] as IActor[]
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

  iter() {
    return this.#actors[Symbol.iterator]()
  }

  has(id: string) {
    return this.#idSet.has(id)
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
      return new BlockMap(fallbackUrl, globalThis.Object.assign(obj, { i, j }))
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

export class Field implements IField {
  #el: HTMLElement
  #blocks: Record<string, FieldBlock> = {}
  #blockElements: Record<string, HTMLCanvasElement> = {}
  #loadScope = new BlockLoadScope()
  #unloadScope = new BlockUnloadScope()
  #activateScope: RectScope
  #mapLoader = new BlockMapLoader(new URL("map/", location.href).href)
  #initialBlocksLoaded = false
  #initialActivateReady = false

  #actors: FieldActors
  #items: FieldItems
  #objects: FieldObjects

  constructor(el: HTMLElement, activateScope: RectScope) {
    this.#el = el
    this.#activateScope = activateScope
    this.#actors = new FieldActors([], activateScope)
    this.#items = new FieldItems(activateScope)
    this.#objects = new FieldObjects(activateScope)
  }

  get actors() {
    return this.#actors
  }

  get items() {
    return this.#items
  }

  get objects() {
    return this.#objects
  }

  async #addBlock(block: FieldBlock) {
    console.log("adding district i", block.i, "j", block.j, "id", block.id)
    this.#blocks[block.id] = block
    const canvas = block.canvas
    this.#blockElements[block.id] = canvas
    this.#el.appendChild(canvas)
    await block.loadAssets({ loadImage })
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
  #getCell(i: number, j: number): FieldCell {
    return this.#getBlock(i, j).getCell(i, j)
  }
  step(): void {
    this.#actors.step(this)
    this.#items.step(this)
    this.#objects.step(this)
  }
  canEnter(i: number, j: number): boolean {
    return this.#getCell(i, j).canEnter && !this.#actors.checkCollision(i, j) &&
      this.#objects.canEnter(i, j)
  }
  peekItem(i: number, j: number): IItem | undefined {
    return this.#items.get(i, j)
  }
  collectItem(i: number, j: number): void {
    this.#items.collect(i, j)
  }

  #hasBlock(blockId: string) {
    return !!this.#blocks[blockId]
  }

  translateBackground(x: number, y: number) {
    this.#el.style.transform = `translateX(${x}px) translateY(${y}px)`
  }

  async checkBlockLoad(
    i: number,
    j: number,
    viewScope: RectScope,
  ) {
    this.#loadScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
    const blockIdsToLoad = this.#loadScope.blockIds().filter((id) =>
      !this.#hasBlock(id)
    )
    for (const map of await this.#mapLoader.loadMaps(blockIdsToLoad)) {
      this.#addBlock(new FieldBlock(map))
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
        { viewScope, initialLoad: true },
      ).then(() => {
        console.log("initial actors ready")
        this.#initialActivateReady = true
      })
    }
  }

  checkBlockUnload(i: number, j: number) {
    this.#unloadScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
    for (const block of globalThis.Object.values(this.#blocks)) {
      if (!this.#unloadScope.overlaps(block)) {
        console.log("unloading block", block.id)
        this.#removeBlock(block)
      }
    }
  }

  async checkActivate(
    i: number,
    j: number,
    { viewScope, initialLoad = false }: {
      viewScope: RectScope
      initialLoad?: boolean
    },
  ) {
    const chunks = [...this.#getChunks(i, j)]
    const newCharSpawns = chunks.flatMap((c) => c.getCharacterSpawns())
      .filter((spawn) => !this.#actors.has(spawn.id)) // isn't spawned yet
      .filter((spawn) => initialLoad || !viewScope.overlaps(spawn)) // not in view
      .filter((spawn) => this.#activateScope.overlaps(spawn)) // in activate scope

    const newItemSpawns = chunks.flatMap((c) => c.getItemSpawns())
      .filter((spawn) => !this.#items.isCollected(spawn.id)) // isn't collected yet
      .filter((spawn) => initialLoad || !viewScope.overlaps(spawn)) // not in view
      .filter((spawn) => this.#activateScope.overlaps(spawn)) // in activate scope

    const newObjectSpawns = chunks.flatMap((c) => c.getObjectSpawns())
      .filter((spawn) => initialLoad || !viewScope.overlaps(spawn)) // not in view
      .filter((spawn) => this.#activateScope.overlaps(spawn)) // in activate scope

    if (newCharSpawns.length > 0) {
      console.log(`Spawning ${newCharSpawns.length} characters`)
      for (const spawn of newCharSpawns) {
        this.#actors.add(spawnCharacter(
          spawn.id,
          spawn.type,
          spawn.i,
          spawn.j,
          new URL(spawn.src, spawn.srcBase).href,
          {
            dir: spawn.dir,
            speed: spawn.speed,
          },
        ))
      }
      await this.#actors.loadAssets({ loadImage })
    } else if (initialLoad) {
      await this.#actors.loadAssets({ loadImage })
    }

    if (newItemSpawns.length > 0) {
      console.log(`Spawning ${newItemSpawns.length} items`)
      for (const spawn of newItemSpawns) {
        if (this.#items.get(spawn.i, spawn.j)) {
          // The space is already occupied by some other item
          continue
        }
        this.#items.add(
          new Item(
            spawn.id,
            spawn.i,
            spawn.j,
            spawn.type,
            new URL(spawn.src, spawn.srcBase).href,
          ),
        )
      }
      await this.#items.loadAssets({ loadImage })
    } else if (initialLoad) {
      await this.#items.loadAssets({ loadImage })
    }

    if (newObjectSpawns.length > 0) {
      console.log(`Spawning ${newObjectSpawns.length} objects`)
      for (const spawn of newObjectSpawns) {
        if (this.#objects.get(spawn.i, spawn.j)) {
          // The space is already occupied by some other object
          continue
        }
        this.#objects.add(
          new Object(
            spawn.id,
            spawn.i,
            spawn.j,
            spawn.type,
            new URL(spawn.src, spawn.srcBase).href,
          ),
        )
      }
      await this.#objects.loadAssets({ loadImage })
    } else if (initialLoad) {
      await this.#objects.loadAssets({ loadImage })
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
