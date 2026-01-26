import * as signal from "../util/signal.ts"
import { ceilN, floorN } from "../util/math.ts"
import { BLOCK_CHUNK_SIZE, BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"
import type {
  Dir,
  IActor,
  IColorBox,
  IField,
  IFinishable,
  IItem,
  ILoader,
  IProp,
  IStepper,
  LoadOptions,
} from "../model/types.ts"
import { Actor, spawnActor } from "../model/actor.ts"
import { Item } from "../model/item.ts"
import { Prop } from "../model/prop.ts"
import {
  BlockMap,
  FieldBlock,
  type FieldBlockChunk,
} from "../model/field-block.ts"
import { loadImage } from "../util/load.ts"
import { RectScope } from "../util/rect-scope.ts"
import { DIRS, nextGrid } from "../util/dir.ts"
import { CellDefinition, loadCatalog } from "../model/catalog.ts"

class FieldEffects implements IStepper {
  #effects = new Set<IStepper & IColorBox & IFinishable>()

  step(field: IField): void {
    for (const effect of this.#effects) {
      effect.step(field)
      if (effect.finished) {
        this.#effects.delete(effect)
      }
    }
  }

  add(effect: IStepper & IColorBox & IFinishable) {
    this.#effects.add(effect)
  }

  iter() {
    return this.#effects[Symbol.iterator]()
  }
}

/** The items on the field */
export class FieldItems implements IStepper, ILoader {
  #items: Set<IItem> = new Set()
  #coordMap = {} as Record<string, IItem>
  #deactivateScope: RectScope

  constructor(scope: RectScope) {
    this.#deactivateScope = scope
  }

  checkDeactivate(i: number, j: number) {
    this.#deactivateScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)

    this.#items.values()
      .filter((item) => !this.#deactivateScope.overlaps(item))
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

export class FieldProps implements IStepper, ILoader {
  #props: Set<IProp> = new Set()
  #coordMap = {} as Record<string, IProp>
  #deactivateScope: RectScope

  constructor(scope: RectScope) {
    this.#deactivateScope = scope
  }

  checkDeactivate(i: number, j: number) {
    this.#deactivateScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)

    this.#props.values()
      .filter((obj) => !this.#deactivateScope.overlaps(obj))
      .forEach((obj) => {
        console.log("deactivating object", obj.id)
        this.remove(obj.i, obj.j)
      })
    signal.propsCount.update(this.#props.size)
  }

  add(obj: IProp) {
    this.#props.add(obj)
    this.#coordMap[`${obj.i}.${obj.j}`] = obj
    signal.propsCount.update(this.#props.size)
  }

  get(i: number, j: number): IProp | undefined {
    return this.#coordMap[`${i}.${j}`]
  }

  remove(i: number, j: number): IProp | undefined {
    const key = `${i}.${j}`
    const obj = this.#coordMap[key]
    if (!obj) {
      return
    }
    this.#props.delete(obj)
    delete this.#coordMap[key]
    signal.propsCount.update(this.#props.size)
    return obj
  }

  canEnter(i: number, j: number): boolean {
    const obj = this.get(i, j)
    return obj === undefined || obj.canEnter
  }

  async loadAssets(options: LoadOptions): Promise<void> {
    await Promise.all(
      [...this.#props]
        .filter((obj) => !obj.assetsReady)
        .map((obj) => obj.loadAssets(options)),
    )
  }

  get assetsReady(): boolean {
    return [...this.#props].every((x) => x.assetsReady)
  }

  step(field: IField) {
    for (const prop of this.#props) {
      prop.step(field)
    }
  }

  iter() {
    return this.#props[Symbol.iterator]()
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
  #deactivateScope: RectScope
  #idSet: Set<string> = new Set()

  /**
   * @param i world grid index
   * @param j world grid index
   * @return true if there is a character at the given grid coordinate
   */
  checkCollision(i: number, j: number) {
    return this.#coordCountMap.get(`${i}.${j}`) > 0
  }

  constructor(chars: IActor[] = [], deactivateScope: RectScope) {
    this.#deactivateScope = deactivateScope
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
    let needsSort = false
    for (const actor of this.#actors) {
      this.#coordCountMap.decrement(actor.physicalGridKey)
      const j = actor.j
      actor.step(field)
      this.#coordCountMap.increment(actor.physicalGridKey)
      if (actor.j !== j) {
        needsSort = true
      }
    }
    // Sort actors by j-coordinate to ensure correct rendering order
    // FIXME(kt3k): This is a naive implementation. Optimize this later.
    if (needsSort) {
      this.#actors.sort((a, b) => a.j - b.j)
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
    this.#deactivateScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)

    const actors = [] as IActor[]
    for (const actor of this.#actors) {
      if (this.#deactivateScope.overlaps(actor)) {
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

  get(i: number, j: number): IActor[] {
    const key = `${i}.${j}`
    return this.#actors.filter((actor) => actor.physicalGridKey === key)
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
  #url: string

  constructor(url: string) {
    this.#url = url
  }

  loadMaps(mapIds: string[]) {
    return Promise.all(mapIds.map((mapId) => this.loadMap(mapId)))
  }

  async loadMap(mapId: string) {
    const url = new URL(`block_${mapId}.json`, this.#url).href
    this.#loading.add(url)
    try {
      const resp = await fetch(url)
      const mapObj = await resp.json()
      const catalog = await loadCatalog(url, mapObj.catalogs)
      return new BlockMap(url, mapObj, catalog)
    } catch {
      const fallbackUrl = new URL("block_not_found.json", this.#url).href
      const resp = await fetch(fallbackUrl)
      const mapObj = await resp.json()
      // Fix the map grid coordinates
      const [i, j] = mapId.split(".").map(Number) // mapId is in the form "i.j"
      const catalog = await loadCatalog(fallbackUrl, mapObj.catalogs)
      return new BlockMap(
        fallbackUrl,
        globalThis.Object.assign(mapObj, { i, j }),
        catalog,
      )
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
  #props: FieldProps
  #effects: FieldEffects

  #time = 0

  constructor(
    el: HTMLElement,
    activateScope: RectScope,
    deactivateScope: RectScope,
  ) {
    this.#el = el
    this.#activateScope = activateScope
    this.#actors = new FieldActors([], deactivateScope)
    this.#items = new FieldItems(deactivateScope)
    this.#props = new FieldProps(deactivateScope)
    this.#effects = new FieldEffects()
  }

  get actors() {
    return this.#actors
  }

  get items() {
    return this.#items
  }

  get props() {
    return this.#props
  }

  get effects() {
    return this.#effects
  }

  /** The current time in the field */
  get time() {
    return this.#time
  }

  colorCell(i: number, j: number, color: string): void {
    this.#getBlock(i, j).drawCellColor(i, j, color)
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
  #getCell(i: number, j: number): CellDefinition {
    return this.#getBlock(i, j).getCell(i, j)
  }
  step(): void {
    this.#time++
    this.#actors.step(this)
    this.#items.step(this)
    this.#props.step(this)
    this.#effects.step(this)
  }
  canEnter(i: number, j: number): boolean {
    return this.#getCell(i, j).canEnter && !this.#actors.checkCollision(i, j) &&
      this.#props.canEnter(i, j)
  }
  canEnterStatic(i: number, j: number): boolean {
    return this.#getCell(i, j).canEnter && this.#props.canEnter(i, j)
  }
  peekItem(i: number, j: number): IItem | undefined {
    return this.#items.get(i, j)
  }
  collectItem(i: number, j: number): void {
    this.#items.collect(i, j)
  }

  // Spawns a new actor at the given grid coordinate
  // if the actor type is unavailable in the given block, returns null
  spawnActor(type: string, i: number, j: number, dir: Dir): IActor | null {
    const def = this.#getBlock(i, j).catalog.actors[type]

    if (!def) {
      console.log("Unable to spawn actor of type:", type)
      return null
    }

    const actor = spawnActor(
      `${i}.${j}.${type}.${crypto.randomUUID()}`,
      i,
      j,
      def,
      { dir },
    )
    this.actors.add(actor)
    actor.loadAssets({ loadImage })

    return actor
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
    this.#activateScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)

    const chunks = [...this.#getChunks(i, j)]
    const newCharSpawns = chunks.flatMap((c) => c.getCharacterSpawns())
      .filter((spawn) => !this.#actors.has(spawn.id)) // isn't spawned yet
      .filter((spawn) => initialLoad || !viewScope.overlaps(spawn)) // not in view
      .filter((spawn) => this.#activateScope.overlaps(spawn)) // in activate scope

    const newItemSpawns = chunks.flatMap((c) => c.getItemSpawns())
      .filter((spawn) => !this.#items.isCollected(spawn.id)) // isn't collected yet
      .filter((spawn) => initialLoad || !viewScope.overlaps(spawn)) // not in view
      .filter((spawn) => this.#activateScope.overlaps(spawn)) // in activate scope

    const newObjectSpawns = chunks.flatMap((c) => c.getPropSpawns())
      .filter((spawn) => initialLoad || !viewScope.overlaps(spawn)) // not in view
      .filter((spawn) => this.#activateScope.overlaps(spawn)) // in activate scope

    if (newCharSpawns.length > 0) {
      let i = 0
      for (const spawn of newCharSpawns) {
        i++
        this.#actors.add(Actor.fromSpawn(spawn))
      }
      if (i > 0) {
        console.log(`Spawning ${i} actors`)
        await this.#actors.loadAssets({ loadImage })
      }
    } else if (initialLoad) {
      await this.#actors.loadAssets({ loadImage })
    }

    if (newItemSpawns.length > 0) {
      let i = 0
      for (const spawn of newItemSpawns) {
        if (this.#items.get(spawn.i, spawn.j)) {
          // The space is already occupied by some other item
          continue
        }
        i++
        this.#items.add(
          new Item(
            spawn.id,
            spawn.i,
            spawn.j,
            spawn.type,
            spawn.def,
          ),
        )
      }
      if (i > 0) {
        console.log(`Spawning ${i} items`)
        await this.#items.loadAssets({ loadImage })
      }
    } else if (initialLoad) {
      await this.#items.loadAssets({ loadImage })
    }

    if (newObjectSpawns.length > 0) {
      let i = 0
      for (const spawn of newObjectSpawns) {
        if (this.#props.get(spawn.i, spawn.j)) {
          // The space is already occupied by some other object
          continue
        }
        i++
        this.#props.add(Prop.fromSpawn(spawn))
      }
      if (i > 0) {
        console.log(`Spawning ${i} objects`)
        await this.#props.loadAssets({ loadImage })
      }
    } else if (initialLoad) {
      await this.#props.loadAssets({ loadImage })
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

export function splashColor(
  field: IField,
  i: number,
  j: number,
  hue: number,
  sat: number,
  light: number,
  alpha: number = 0.40,
  radius: number = 2,
  _rng: () => number = Math.random,
): void {
  if (radius < 1) {
    return
  }
  colorCell(i, j, hue, sat, light, alpha, field)
  if (radius < 2) {
    return
  }
  for (const dir of DIRS) {
    for (let dist = 2; dist <= radius; dist++) {
      const [i_, j_] = nextGrid(i, j, dir, dist - 1)
      if (!field.canEnterStatic(i_, j_)) break
      setTimeout(() => {
        colorCell(
          i_,
          j_,
          hue,
          sat,
          light,
          alpha * 0.6 ** dist,
          field,
        )
      }, dist * 32)
    }
  }
}

function colorCell(
  i: number,
  j: number,
  hue: number,
  sat: number,
  light: number,
  alpha: number,
  field: IField,
): void {
  field.colorCell(
    i,
    j,
    `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`,
  )
}
