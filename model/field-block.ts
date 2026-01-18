import { CanvasWrapper } from "../util/canvas-wrapper.ts"
import { BLOCK_CHUNK_SIZE, BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"
import { randomInt, seed } from "../util/random.ts"
import { floorN, modulo } from "../util/math.ts"
import { loadImage } from "../util/load.ts"
import type { Dir, IBox } from "./types.ts"
import type { ItemType, LoadOptions, PropType as PropType } from "./types.ts"
import {
  ActorDefinition,
  Catalog,
  CellDefinition,
  ItemDefinition,
  PropDefinition,
} from "./catalog.ts"

/** Global coordinates to local chunk index */
function g2c(i: number, j: number): [number, number] {
  const [localI, localJ] = g2l(i, j)
  const k = floorN(localI, BLOCK_CHUNK_SIZE) / BLOCK_CHUNK_SIZE
  const l = floorN(localJ, BLOCK_CHUNK_SIZE) / BLOCK_CHUNK_SIZE
  return [k, l]
}

/** Global coordinates to local coordinates */
function g2l(i: number, j: number): [number, number] {
  const localI = modulo(i, BLOCK_SIZE)
  const localJ = modulo(j, BLOCK_SIZE)
  return [localI, localJ]
}

/** {@linkcode ItemSpawnInfo} represents the spawn info for the items in {@linkcode FieldBlock} */
export class ItemSpawnInfo implements IBox {
  readonly id: string
  readonly i: number
  readonly j: number
  readonly type: ItemType
  readonly def: ItemDefinition
  readonly x: number
  readonly y: number
  readonly w = CELL_SIZE
  readonly h = CELL_SIZE
  constructor(
    i: number,
    j: number,
    type: ItemType,
    def: ItemDefinition,
  ) {
    this.id = `${i}.${j}.${type}` // Unique ID for the spawn
    this.i = i
    this.j = j
    this.type = type
    this.def = def
    this.x = i * CELL_SIZE
    this.y = j * CELL_SIZE
  }

  equals(other: ItemSpawnInfo): boolean {
    return this.i === other.i && this.j === other.j &&
      this.type === other.type
  }

  toJSON(): BlockMapSource["items"][number] {
    return {
      i: this.i,
      j: this.j,
      type: this.type,
    }
  }
}

/** {@linkcode PropSpawnInfo} represents the spawn info for the props in {@linkcode FieldBlock} */
export class PropSpawnInfo implements IBox {
  readonly id: string
  readonly i: number
  readonly j: number
  readonly type: PropType
  readonly def: PropDefinition
  readonly x: number
  readonly y: number
  readonly w = CELL_SIZE
  readonly h = CELL_SIZE
  constructor(
    i: number,
    j: number,
    type: PropType,
    def: PropDefinition,
  ) {
    this.id = `${i}.${j}.${type}` // Unique ID for the spawn
    this.i = i
    this.j = j
    this.type = type
    this.def = def
    this.x = i * CELL_SIZE
    this.y = j * CELL_SIZE
  }

  equals(other: PropSpawnInfo): boolean {
    return this.i === other.i && this.j === other.j &&
      this.type === other.type
  }

  toJSON(): BlockMapSource["props"][number] {
    return {
      i: this.i,
      j: this.j,
      type: this.type,
    }
  }
}

type ActorSpeed = 1 | 2 | 4 | 8 | 16

export class ActorSpawnInfo implements IBox {
  readonly id: string
  readonly i: number
  readonly j: number
  readonly def: ActorDefinition
  readonly dir?: Dir
  readonly speed?: ActorSpeed
  readonly x: number
  readonly y: number
  readonly w = CELL_SIZE
  readonly h = CELL_SIZE
  constructor(
    i: number,
    j: number,
    def: ActorDefinition,
    { dir, speed }: {
      dir?: Dir
      speed?: ActorSpeed
    } = {},
  ) {
    this.id = `${i}.${j}.${def.type}.${speed ?? "-"}.${dir ?? "-"}` // Unique ID for the spawn
    this.i = i
    this.j = j
    this.dir = dir
    this.speed = speed
    this.def = def
    this.x = i * CELL_SIZE
    this.y = j * CELL_SIZE
  }

  equals(other: ActorSpawnInfo): boolean {
    return this.i === other.i &&
      this.j === other.j &&
      this.def.type === other.def.type &&
      this.dir === other.dir &&
      this.speed === other.speed
  }

  toJSON(): BlockMapSource["actors"][number] {
    return {
      i: this.i,
      j: this.j,
      type: this.def.type,
      dir: this.dir,
      speed: this.speed,
    }
  }
}

const CHUNK_COUNT_X = BLOCK_SIZE / BLOCK_CHUNK_SIZE
const CHUNK_COUNT_Y = BLOCK_SIZE / BLOCK_CHUNK_SIZE

export class SpawnMap<
  T extends {
    i: number
    j: number
    equals(other: T): boolean
    toJSON(): S
  },
  S = ReturnType<T["toJSON"]>,
> {
  #chunks: T[][][] = Array.from(
    { length: CHUNK_COUNT_X },
    () => Array.from({ length: CHUNK_COUNT_Y }, () => []),
  )
  #map = {} as Record<string, T>

  constructor(spawnInfo: T[]) {
    for (const spawn of spawnInfo) {
      this.add(spawn)
    }
  }

  clear(): void {
    this.#chunks = Array.from(
      { length: CHUNK_COUNT_X },
      () => Array.from({ length: CHUNK_COUNT_Y }, () => []),
    )
    this.#map = {}
  }

  #key(i: number, j: number): string {
    return i + "." + j
  }

  add(spawn: T): void {
    this.#map[this.#key(spawn.i, spawn.j)] = spawn
    const [k, l] = g2c(spawn.i, spawn.j)
    this.#chunks[k][l].push(spawn)
  }

  get(i: number, j: number): T | undefined {
    return this.#map[this.#key(i, j)]
  }

  has(i: number, j: number): boolean {
    return !!this.#map[this.#key(i, j)]
  }

  remove(i: number, j: number): void {
    const spawn = this.#map[this.#key(i, j)]
    if (!spawn) return
    delete this.#map[this.#key(i, j)]
    const [k, l] = g2c(i, j)
    this.#chunks[k][l] = this.#chunks[k][l].filter((s) => s !== spawn)
  }

  /**
   * @param i world grid index
   * @param j world grid index
   */
  getChunk(i: number, j: number): T[] {
    const [k, l] = g2c(i, j)
    return this.#chunks[k][l]
  }

  getAll(): T[] {
    return Object.values(this.#map)
  }

  diff(other: SpawnMap<T, S>): (["add", T] | ["remove", T])[] {
    const diff: (["add", T] | ["remove", T])[] = []
    for (const spawn of other.getAll()) {
      const existing = this.get(spawn.i, spawn.j)
      if (!existing) {
        diff.push(["add", spawn])
      } else if (!existing.equals(spawn)) {
        diff.push(["remove", existing])
        diff.push(["add", spawn])
      }
    }
    for (const spawn of this.getAll()) {
      if (!other.get(spawn.i, spawn.j)) {
        diff.push(["remove", spawn])
      }
    }
    return diff
  }

  toJSON(): S[] {
    return this.getAll().map((s) => s.toJSON())
  }
}

interface BlockMapSource {
  i: number
  j: number
  catalogs: string[]
  actors: {
    i: number
    j: number
    type: string
    dir?: Dir
    speed?: ActorSpeed
  }[]
  items: {
    i: number
    j: number
    type: string
  }[]
  props: {
    i: number
    j: number
    type: string
  }[]
  field: string[]
}

/**
 * {@linkcode BlockMap} is a map (serialized form) of {@linkcode FieldBlock}
 *
 * Convension of coordinates symbols:
 * - `i`: column of the world grid coordinates
 * - `j`: row of the world grid coordinates
 * - `x`: column of the word pixel coordinates
 * - `y`: row of the word pixel coordinates
 * - `k`: column of the relative chunk coordinates (0 to 9)
 * - `l`: row of the relative chunk coordinates (0 to 9)
 */
export class BlockMap {
  /** The URL of the map */
  readonly url: string
  // The column of the world coordinates
  readonly i: number
  // The row of the world coordinates
  readonly j: number
  readonly actors: ActorSpawnInfo[]
  readonly items: ItemSpawnInfo[]
  readonly props: PropSpawnInfo[] = []
  readonly field: string[]
  #source: BlockMapSource
  catalog: Catalog
  constructor(url: string, obj: BlockMapSource, catalog: Catalog) {
    this.url = url
    this.i = obj.i
    this.j = obj.j
    this.actors = (obj.actors ?? []).map((spawn) =>
      new ActorSpawnInfo(
        spawn.i,
        spawn.j,
        catalog.actors[spawn.type]!,
        {
          dir: spawn.dir,
          speed: spawn.speed,
        },
      )
    )
    this.items = (obj.items ?? []).map((item) =>
      new ItemSpawnInfo(
        item.i,
        item.j,
        item.type as ItemType,
        catalog.items[item.type]!,
      )
    )
    this.props = (obj.props ?? []).map((prop) =>
      new PropSpawnInfo(
        prop.i,
        prop.j,
        prop.type as PropType,
        catalog.props[prop.type]!,
      )
    )
    this.field = obj.field
    this.#source = obj
    this.catalog = catalog
  }

  clone(): BlockMap {
    return new BlockMap(this.url, structuredClone(this.#source), this.catalog)
  }

  toObject() {
    return this.#source
  }
}

export function drawCellColor(
  wrapper: CanvasWrapper,
  i: number,
  j: number,
  color: string,
  margin = 1,
) {
  const [localI, localJ] = g2l(i, j)
  const { randomInt } = seed(`${i}.${j}`)
  margin = randomInt(3)
  wrapper.drawRect(
    localI * CELL_SIZE + margin,
    localJ * CELL_SIZE + margin,
    CELL_SIZE - margin * 2,
    CELL_SIZE - margin * 2,
    color,
  )
}

const ENABLE_AMBIENT_CELL_COLOR = false
const ENABLE_AMBIENT_CELL_NOISE = true

/** Draws a cell on the canvas */
export function drawCell(
  wrapper: CanvasWrapper,
  i: number,
  j: number,
  cell: CellDefinition,
  image: ImageBitmap,
) {
  const [localI, localJ] = g2l(i, j)
  wrapper.drawImage(
    image,
    localI * CELL_SIZE,
    localJ * CELL_SIZE,
  )
  if (ENABLE_AMBIENT_CELL_COLOR) {
    const { rng } = seed(`${i}.${j}`)
    let color: string
    if (cell.canEnter) {
      color = `hsla(${rng() * 100 + 100}, 50%, 20%, ${rng() * 0.1 + 0.1})`
    } else {
      color = `hsla(240, 100%, 10%, ${rng() * 0.2 + 0.15})`
    }
    wrapper.drawRect(
      localI * CELL_SIZE,
      localJ * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE,
      color,
    )
  }
  if (ENABLE_AMBIENT_CELL_NOISE) {
    const { randomInt } = seed(`${i}.${j}`)
    const width = randomInt(3) + 1
    const x = randomInt(15 - width) + 1
    const y = randomInt(14) + 1
    const color = cell.canEnter ? "#b9bcb9" : "black"
    wrapper.drawRect(
      localI * CELL_SIZE + x,
      localJ * CELL_SIZE + y,
      width,
      1,
      color,
    )
  }
}

function renderRange(
  wrapper: CanvasWrapper,
  i: number,
  j: number,
  width: number,
  height: number,
  cells: Record<string, CellDefinition>,
  imgMap: Record<string, ImageBitmap>,
  field: string[],
) {
  for (let ii = 0; ii < width; ii++) {
    for (let jj = 0; jj < height; jj++) {
      const [localI, localJ] = g2l(i + ii, j + jj)
      const cell = cells[field[localJ][localI]]
      drawCell(
        wrapper,
        i + ii,
        j + jj,
        cell,
        imgMap[cell.name],
      )
    }
  }
}

export function createImageDataForRange(
  i: number,
  j: number,
  gridWidth: number,
  gridHeight: number,
  cells: Record<string, CellDefinition>,
  imgMap: Record<string, ImageBitmap>,
  field: string[],
): ImageData {
  const canvas = new OffscreenCanvas(
    CELL_SIZE * BLOCK_SIZE,
    CELL_SIZE * BLOCK_SIZE,
  )
  const wrapper = new CanvasWrapper(canvas)
  renderRange(wrapper, i, j, gridWidth, gridHeight, cells, imgMap, field)
  return canvas.getContext("2d")!.getImageData(
    CELL_SIZE * i,
    CELL_SIZE * j,
    CELL_SIZE * gridWidth,
    CELL_SIZE * gridHeight,
  )
}

/** {@linkcode FieldBlock} represents a {@linkcode BLOCK_SIZE} x {@linkcode BLOCK_SIZE} block of a field */
export class FieldBlock {
  #x: number
  #y: number
  #w: number
  #h: number
  // The column of the world coordinates
  #i: number
  // The row of the world coordinates
  #j: number
  imgMap: Record<string, ImageBitmap> = {}
  actorSpawn: SpawnMap<ActorSpawnInfo>
  itemSpawns: SpawnMap<ItemSpawnInfo>
  propSpawns: SpawnMap<PropSpawnInfo>
  field: string[]
  #map: BlockMap
  #canvas: HTMLCanvasElement | undefined
  #canvasWrapper: CanvasWrapper | undefined
  #assetsReady = false
  #chunks: Record<string, boolean | "loading"> = {}

  constructor(map: BlockMap) {
    this.#i = map.i
    this.#j = map.j
    this.#x = this.#i * CELL_SIZE
    this.#y = this.#j * CELL_SIZE
    this.#h = BLOCK_SIZE * CELL_SIZE
    this.#w = BLOCK_SIZE * CELL_SIZE
    this.field = map.field
    this.#map = map
    this.actorSpawn = new SpawnMap(map.actors)
    this.itemSpawns = new SpawnMap(map.items)
    this.propSpawns = new SpawnMap(map.props)
  }

  get catalog(): Catalog {
    return this.#map.catalog
  }

  loadCellImage(href: string, options: LoadOptions): Promise<ImageBitmap> {
    return options.loadImage
      ? options.loadImage(href)
      : Promise.reject(new Error("no loadImage specified"))
  }

  async loadCellImages(options: LoadOptions) {
    await Promise.all(
      Object.values(this.#map.catalog.cells).map(async (def) => {
        this.imgMap[def.name] = await this.loadCellImage(def.href, options)
      }),
    )
  }

  clone(): FieldBlock {
    return new FieldBlock(this.#map.clone())
  }

  get id(): string {
    return `${this.#i}.${this.#j}`
  }

  get url(): string {
    return this.#map.url
  }

  get cells(): Record<string, CellDefinition> {
    return this.#map.catalog.cells
  }

  get canvas(): HTMLCanvasElement {
    if (!this.#canvas) {
      this.#canvas = this.#createCanvas()
    }
    return this.#canvas
  }

  get canvasWrapper(): CanvasWrapper {
    if (!this.#canvasWrapper) {
      this.#canvasWrapper = new CanvasWrapper(this.canvas)
    }
    return this.#canvasWrapper
  }

  async loadAssets(options: LoadOptions) {
    await this.loadCellImages(options)
    this.#assetsReady = true
  }

  get assetsReady(): boolean {
    return this.#assetsReady
  }

  #createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas")
    canvas.style.position = "absolute"
    canvas.style.left = `${this.x}px`
    canvas.style.top = `${this.y}px`
    canvas.width = this.w
    canvas.height = this.h
    canvas.classList.add("crisp-edges")
    return canvas
  }

  #createOverlay(k: number, l: number) {
    const overlay = document.createElement("div")
    overlay.style.position = "absolute"
    overlay.style.left = `${this.x + k * BLOCK_CHUNK_SIZE * CELL_SIZE}px`
    overlay.style.top = `${this.y + l * BLOCK_CHUNK_SIZE * CELL_SIZE}px`
    overlay.style.width = `${BLOCK_CHUNK_SIZE * CELL_SIZE}px`
    overlay.style.height = `${BLOCK_CHUNK_SIZE * CELL_SIZE}px`
    overlay.style.pointerEvents = "none"
    overlay.style.zIndex = "1"
    overlay.style.backgroundColor = "hsla(0, 0%, 10%, 1)"
    overlay.style.transition = "background-color 1s linear"
    this.canvas.parentElement?.appendChild(overlay)
    return () => {
      overlay.style.backgroundColor = "hsla(0, 0%, 10%, 0)"
      overlay.addEventListener("transitionend", () => {
        overlay.remove()
      })
    }
  }

  drawCellColor(i: number, j: number, color: string, margin = 1) {
    drawCellColor(this.canvasWrapper, i, j, color, margin)
  }

  renderAll() {
    renderRange(
      new CanvasWrapper(this.canvas),
      0,
      0,
      BLOCK_SIZE,
      BLOCK_SIZE,
      this.#map.catalog.cells,
      this.imgMap,
      this.field,
    )
  }

  getChunk(i: number, j: number): FieldBlockChunk {
    if (
      i < this.#i || i >= this.#i + BLOCK_SIZE || j < this.#j ||
      j >= this.#j + BLOCK_SIZE
    ) {
      throw new Error("Chunk out of bounds")
    }
    return new FieldBlockChunk(i, j, this)
  }

  async renderChunk(
    i: number,
    j: number,
    { initialLoad = false } = {},
  ): Promise<void> {
    const [k, l] = g2c(i, j)
    const wrapper = new CanvasWrapper(this.canvas)

    const chunkKey = `${k}.${l}`
    const chunkState = this.#chunks[chunkKey]
    if (chunkState === true || chunkState === "loading") {
      return
    }
    console.log("Rendering chunk", this.id, k, l)
    let removeOverlay: () => void = () => {}
    if (!initialLoad) {
      removeOverlay = this.#createOverlay(k, l)
    }
    this.#chunks[chunkKey] = "loading"
    const render = Promise.withResolvers<void>()
    const worker = new Worker("./canvas-worker.js")
    worker.onmessage = (event) => {
      const { imageData } = event.data
      const offsetX = k * BLOCK_CHUNK_SIZE * CELL_SIZE
      const offsetY = l * BLOCK_CHUNK_SIZE * CELL_SIZE
      wrapper.ctx.putImageData(
        imageData,
        offsetX,
        offsetY,
      )
      worker.terminate()
      render.resolve()
      this.#chunks[chunkKey] = true
      removeOverlay()
    }
    worker.postMessage({
      cells: this.#map.catalog.cells,
      imgMap: this.imgMap,
      i: k * BLOCK_CHUNK_SIZE,
      j: l * BLOCK_CHUNK_SIZE,
      gridWidth: BLOCK_CHUNK_SIZE,
      gridHeight: BLOCK_CHUNK_SIZE,
      field: this.field,
    })
    await render.promise
    return
  }

  /**
   * @param i world grid index
   * @param j world grid index
   * @returns the cell at the given world grid coordinates
   */
  getCell(i: number, j: number): CellDefinition {
    const [localI, localJ] = g2l(i, j)
    return this.#map.catalog.cells[this.field[localJ][localI]]
  }
  /** Updates a cell at the given coordinates with the given cell name.
   * This is for editor use.
   */
  updateCell(i: number, j: number, cell: string): void {
    const [relI, relJ] = g2l(i, j)
    this.field[relJ] = this.field[relJ].substring(0, relI) + cell +
      this.field[relJ].substring(relI + 1)
  }
  get i(): number {
    return this.#i
  }
  get j(): number {
    return this.#j
  }
  get x(): number {
    return this.#x
  }
  get y(): number {
    return this.#y
  }
  get h(): number {
    return this.#h
  }
  get w(): number {
    return this.#w
  }

  toMap(): BlockMap {
    return new BlockMap(this.#map.url, {
      i: this.#i,
      j: this.#j,
      catalogs: this.#map.catalog.refs,
      actors: this.actorSpawn.toJSON(),
      items: this.itemSpawns.toJSON(),
      props: this.propSpawns.toJSON(),
      field: this.field,
    }, this.#map.catalog)
  }

  /**
   * Returns the difference between this block and the other block.
   * This is for editor use.
   */
  diffCells(other: FieldBlock): [i: number, j: number, cell: string][] {
    const diff: [i: number, j: number, cell: string][] = []
    for (let j = 0; j < BLOCK_SIZE; j++) {
      for (let i = 0; i < BLOCK_SIZE; i++) {
        const name = other.getCell(i, j).name
        if (this.getCell(i, j).name !== name) {
          diff.push([i, j, name])
        }
      }
    }
    return diff
  }
}

export class FieldBlockChunk {
  #i: number
  #j: number
  #fieldBlock: FieldBlock
  constructor(i: number, j: number, block: FieldBlock) {
    this.#i = i
    this.#j = j
    this.#fieldBlock = block
  }

  getItemSpawns(): ItemSpawnInfo[] {
    return this.#fieldBlock.itemSpawns.getChunk(this.#i, this.#j)
  }

  getCharacterSpawns(): ActorSpawnInfo[] {
    return this.#fieldBlock.actorSpawn.getChunk(this.#i, this.#j)
  }

  getPropSpawns(): PropSpawnInfo[] {
    return this.#fieldBlock.propSpawns.getChunk(this.#i, this.#j)
  }

  async render(initialLoad: boolean) {
    if (!this.#fieldBlock.assetsReady) {
      await this.#fieldBlock.loadAssets({ loadImage })
    }
    return this.#fieldBlock.renderChunk(this.#i, this.#j, { initialLoad })
  }
}
