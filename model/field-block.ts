import { CanvasWrapper } from "../util/canvas-wrapper.ts"
import { BLOCK_CHUNK_SIZE, BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"
import { seed } from "../util/random.ts"
import type { Dir } from "../util/dir.ts"
import { floorN, modulo } from "../util/math.ts"
import type { CellName, IBox, ItemType, NPCType } from "./character.ts"

/**
 * {@linkcode FieldCell} represents the cell in the field block
 */
export class FieldCell {
  readonly name: CellName
  readonly canEnter: boolean
  readonly color?: string
  readonly src?: string[]
  constructor(
    name: CellName,
    canEnter: boolean,
    color?: string,
    src?: string[],
  ) {
    this.name = name
    this.canEnter = canEnter
    this.color = color
    this.src = src
  }
}

/** {@linkcode ItemSpawnInfo} represents the spawn info for the items in {@linkcode FieldBlock} */
export class ItemSpawnInfo implements IBox {
  readonly id: string
  readonly i: number
  readonly j: number
  readonly type: ItemType
  readonly src: string
  readonly srcBase: string
  readonly x: number
  readonly y: number
  readonly w = CELL_SIZE
  readonly h = CELL_SIZE
  constructor(
    i: number,
    j: number,
    type: ItemType,
    src: string,
    srcBase: string,
  ) {
    this.id = `${i}.${j}.${type}` // Unique ID for the spawn
    this.i = i
    this.j = j
    this.type = type
    this.src = src
    this.srcBase = srcBase
    this.x = i * CELL_SIZE
    this.y = j * CELL_SIZE
  }

  toJSON() {
    return {
      i: this.i,
      j: this.j,
      type: this.type,
      src: this.src,
    }
  }
}

type CharacterSpeed = 1 | 2 | 4 | 8 | 16

export class CharacterSpawnInfo implements IBox {
  readonly id: string
  readonly i: number
  readonly j: number
  readonly type: NPCType
  readonly src: string
  readonly srcBase: string
  readonly dir?: Dir
  readonly speed?: CharacterSpeed
  readonly x: number
  readonly y: number
  readonly w = CELL_SIZE
  readonly h = CELL_SIZE
  constructor(
    i: number,
    j: number,
    type: NPCType,
    src: string,
    srcBase: string,
    { dir, speed }: {
      dir?: Dir
      speed?: CharacterSpeed
    } = {},
  ) {
    this.id = `${i}.${j}.${type}.${speed ?? "-"}.${dir ?? "-"}` // Unique ID for the spawn
    this.i = i
    this.j = j
    this.dir = dir
    this.speed = speed
    this.type = type
    this.src = src
    this.srcBase = srcBase
    this.x = i * CELL_SIZE
    this.y = j * CELL_SIZE
  }

  toJSON() {
    return {
      i: this.i,
      j: this.j,
      type: this.type,
      src: this.src,
      dir: this.dir,
      speed: this.speed,
    }
  }
}

const CHUNK_COUNT_X = BLOCK_SIZE / BLOCK_CHUNK_SIZE
const CHUNK_COUNT_Y = BLOCK_SIZE / BLOCK_CHUNK_SIZE

export class ByChunk<T extends { i: number; j: number }> {
  #spawnInfo: T[][][] = Array.from(
    { length: CHUNK_COUNT_X },
    () => Array.from({ length: CHUNK_COUNT_Y }, () => []),
  )

  constructor(spawnInfo: T[]) {
    for (const spawn of spawnInfo) {
      this.add(spawn)
    }
  }

  add(spawn: T): void {
    const relI = modulo(spawn.i, BLOCK_SIZE)
    const relJ = modulo(spawn.j, BLOCK_SIZE)
    const k = floorN(relI, BLOCK_CHUNK_SIZE) / BLOCK_CHUNK_SIZE
    const l = floorN(relJ, BLOCK_CHUNK_SIZE) / BLOCK_CHUNK_SIZE
    this.#spawnInfo[k][l].push(spawn)
  }

  get(k: number, l: number): T[] {
    return this.#spawnInfo[k][l]
  }

  getAll(): T[] {
    return this.#spawnInfo.flat(2)
  }
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
  readonly cells: {
    name: CellName
    canEnter: boolean
    color?: string
    src?: string | string[]
  }[]
  readonly characters: CharacterSpawnInfo[]
  readonly items: ItemSpawnInfo[]
  readonly field: string[]
  // deno-lint-ignore no-explicit-any
  #obj: any
  // deno-lint-ignore no-explicit-any
  constructor(url: string, obj: any) {
    this.url = url
    this.i = obj.i
    this.j = obj.j
    this.cells = obj.cells
    this.characters = (obj.characters ?? []).map((
      spawn: {
        i: number
        j: number
        type: NPCType
        src: string
        dir?: Dir
        speed?: CharacterSpeed
      },
    ) =>
      new CharacterSpawnInfo(
        spawn.i,
        spawn.j,
        spawn.type,
        spawn.src,
        this.url,
        {
          dir: spawn.dir,
          speed: spawn.speed,
        },
      )
    )
    this.items = (obj.items ?? []).map((
      item: { i: number; j: number; type: ItemType; src: string },
    ) =>
      new ItemSpawnInfo(
        item.i,
        item.j,
        item.type,
        item.src,
        this.url,
      )
    )
    this.field = obj.field
    this.#obj = obj
  }

  clone(): BlockMap {
    return new BlockMap(this.url, structuredClone(this.#obj))
  }

  toObject() {
    return this.#obj
  }
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
  #cellMap: Record<string, FieldCell> = {}
  #imgMap: Record<string, ImageBitmap> = {}
  #characterSpawnInfoByChunk: ByChunk<CharacterSpawnInfo>
  #itemSpawnInfoByChunk: ByChunk<ItemSpawnInfo>
  #field: string[]
  #loadImage: (url: string) => Promise<ImageBitmap>
  #map: BlockMap
  #canvas: HTMLCanvasElement | undefined
  #assetsReady = false
  #chunks: Record<string, boolean | "loading"> = {}

  constructor(
    map: BlockMap,
    loadImage: (url: string) => Promise<ImageBitmap>,
  ) {
    this.#i = map.i
    this.#j = map.j
    this.#x = this.#i * CELL_SIZE
    this.#y = this.#j * CELL_SIZE
    this.#h = BLOCK_SIZE * CELL_SIZE
    this.#w = BLOCK_SIZE * CELL_SIZE
    for (const cell of map.cells) {
      this.#cellMap[cell.name] = new FieldCell(
        cell.name,
        cell.canEnter,
        cell.color,
        cell.src ? Array.isArray(cell.src) ? cell.src : [cell.src] : undefined,
      )
    }
    this.#field = map.field
    this.#loadImage = loadImage
    this.#map = map
    this.#characterSpawnInfoByChunk = new ByChunk(map.characters)
    this.#itemSpawnInfoByChunk = new ByChunk(map.items)
  }

  loadCellImage(href: string): Promise<ImageBitmap> {
    return this.#loadImage(
      new URL(href, this.#map.url).href,
    )
  }

  async loadCellImages() {
    await Promise.all(
      Object.values(this.#cellMap).map(async (cell) => {
        if (cell.src) {
          for (const src of cell.src) {
            this.#imgMap[src] = await this.loadCellImage(src)
          }
        }
      }),
    )
  }

  clone(): FieldBlock {
    return new FieldBlock(this.#map.clone(), this.#loadImage)
  }

  get id(): string {
    return `${this.#i}.${this.#j}`
  }

  get cells(): FieldCell[] {
    return Object.values(this.#cellMap)
  }

  get cellMap(): Record<string, FieldCell> {
    return this.#cellMap
  }

  get canvas(): HTMLCanvasElement {
    if (!this.#canvas) {
      this.#canvas = this.#createCanvas()
    }
    return this.#canvas
  }

  async loadAssets() {
    await this.loadCellImages()
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

  drawCell(layer: CanvasWrapper, i: number, j: number) {
    const cell = this.getCell(i, j)
    if (cell.src) {
      for (const src of cell.src) {
        layer.drawImage(this.#imgMap[src], i * CELL_SIZE, j * CELL_SIZE)
      }
    } else {
      layer.drawRect(
        i * CELL_SIZE,
        j * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
        cell.color || "black",
      )
    }
    const worldI = this.#i + i
    const worldJ = this.#j + j
    const { rng } = seed(`${worldI}.${worldJ}`)
    let color: string
    if (cell.canEnter) {
      color = `hsla(${rng() * 100 + 100}, 50%, 20%, ${rng() * 0.1 + 0.1})`
    } else {
      color = `hsla(240, 100%, 10%, ${rng() * 0.2 + 0.15})`
    }
    layer.drawRect(
      i * CELL_SIZE,
      j * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE,
      color,
    )
  }

  #renderRange(
    wrapper: CanvasWrapper,
    i: number,
    j: number,
    width: number,
    height: number,
  ) {
    for (let ii = 0; ii < width; ii++) {
      for (let jj = 0; jj < height; jj++) {
        this.drawCell(wrapper, i + ii, j + jj)
      }
    }
  }

  renderAll() {
    const wrapper = new CanvasWrapper(this.canvas)
    this.#renderRange(wrapper, 0, 0, BLOCK_SIZE, BLOCK_SIZE)
  }

  createImageDataForRange(
    i: number,
    j: number,
    gridWidth: number,
    gridHeight: number,
  ): ImageData {
    const canvas = new OffscreenCanvas(
      CELL_SIZE * BLOCK_SIZE,
      CELL_SIZE * BLOCK_SIZE,
    )
    const layer = new CanvasWrapper(canvas)
    this.#renderRange(layer, i, j, gridWidth, gridHeight)
    return canvas.getContext("2d")!.getImageData(
      CELL_SIZE * i,
      CELL_SIZE * j,
      CELL_SIZE * gridWidth,
      CELL_SIZE * gridHeight,
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
    const [k, l] = this.#gridToChunkIndex(i, j)
    const layer = new CanvasWrapper(this.canvas)

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
      layer.ctx.putImageData(
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
      url: this.#map.url,
      obj: { ...this.toMap().toObject(), characters: [], items: [] },
      i: k * BLOCK_CHUNK_SIZE,
      j: l * BLOCK_CHUNK_SIZE,
      gridWidth: BLOCK_CHUNK_SIZE,
      gridHeight: BLOCK_CHUNK_SIZE,
    })
    await render.promise
    return
  }

  getCell(i: number, j: number): FieldCell {
    return this.#cellMap[this.#field[j][i]]
  }
  /** Updates a cell at the given coordinates with the given cell name.
   * This is for editor use.
   */
  update(i: number, j: number, cell: string): void {
    this.#field[j] = this.#field[j].substring(0, i) + cell +
      this.#field[j].substring(i + 1)
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
      cells: this.cells.map((cell) => ({
        name: cell.name,
        canEnter: cell.canEnter,
        color: cell.color,
        src: cell.src
          ? cell.src.length === 1 ? cell.src[0] : cell.src
          : undefined,
      })),
      characters: this.#characterSpawnInfoByChunk
        .getAll().map((spawn) => spawn.toJSON()),
      items: this.#itemSpawnInfoByChunk
        .getAll().map((spawn) => spawn.toJSON()),
      field: this.#field,
    })
  }

  /**
   * Returns the difference between this block and the other block.
   * This is for editor use.
   */
  diff(other: FieldBlock): [i: number, j: number, cell: string][] {
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

  #gridToChunkIndex(i: number, j: number): [number, number] {
    const relI = modulo(i, BLOCK_SIZE)
    const relJ = modulo(j, BLOCK_SIZE)
    const k = floorN(relI, BLOCK_CHUNK_SIZE) / BLOCK_CHUNK_SIZE
    const l = floorN(relJ, BLOCK_CHUNK_SIZE) / BLOCK_CHUNK_SIZE
    return [k, l]
  }

  /** Gets the character spawn info for the given chunk. The chunk should be given by the i, j coordinates of the
   * left and top of the chunk.
   *
   * @param i world grid coordinate
   * @param j world grid coordinate
   */
  getCharacterSpawnInfoForChunk(i: number, j: number): CharacterSpawnInfo[] {
    const [k, l] = this.#gridToChunkIndex(i, j)
    return this.#characterSpawnInfoByChunk.get(k, l)
  }

  /** Adds the spawn info */
  addCharacterSpawnInfo(spawn: CharacterSpawnInfo): void {
    this.#characterSpawnInfoByChunk.add(spawn)
  }

  getItemSpawnInfoForChunk(i: number, j: number): ItemSpawnInfo[] {
    const [k, l] = this.#gridToChunkIndex(i, j)
    return this.#itemSpawnInfoByChunk.get(k, l)
  }

  addItemSpawnInfo(spawn: ItemSpawnInfo): void {
    this.#itemSpawnInfoByChunk.add(spawn)
  }

  /** Clears the spawn info */
  clearSpawnInfo(): void {
    this.#characterSpawnInfoByChunk = new ByChunk([])
    this.#itemSpawnInfoByChunk = new ByChunk([])
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

  getItemSpawnInfo(): ItemSpawnInfo[] {
    return this.#fieldBlock.getItemSpawnInfoForChunk(this.#i, this.#j)
  }

  getCharacterSpawnInfo(): CharacterSpawnInfo[] {
    return this.#fieldBlock.getCharacterSpawnInfoForChunk(this.#i, this.#j)
  }

  render(initialLoad: boolean) {
    return this.#fieldBlock.renderChunk(this.#i, this.#j, { initialLoad })
  }
}
