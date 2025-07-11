import { CanvasWrapper } from "../util/canvas-wrapper.ts"
import { BLOCK_CHUNK_SIZE, BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"
import { seedrandom } from "../util/random.ts"
import { ceilN } from "../util/math.ts"
import type { Character } from "./character.ts"
import type { Item } from "./item.ts"
/**
 * {@linkcode FieldCell} represents the cell in the field block
 */
export class FieldCell {
  #color?: string
  #src?: string[]
  #canEnter: boolean
  #name: string
  constructor(
    name: string,
    canEnter: boolean,
    color?: string,
    src?: string[],
  ) {
    this.#name = name
    this.#canEnter = canEnter
    this.#color = color
    this.#src = src
  }

  canEnter(): boolean {
    return this.#canEnter
  }
  get name(): string {
    return this.#name
  }
  get color(): string | undefined {
    return this.#color
  }
  get src(): string[] | undefined {
    return this.#src
  }
}

class ItemData {
}

class CharacterData {}

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
  url: string
  // The column of the world coordinates
  i: number
  // The row of the world coordinates
  j: number
  cells: {
    name: string
    canEnter: boolean
    color?: string
    href?: string | string[]
  }[]
  // deno-lint-ignore ban-types
  characters: {}[]
  items: Item[]
  field: string[]
  // deno-lint-ignore no-explicit-any
  #obj: any
  // deno-lint-ignore no-explicit-any
  constructor(url: string, obj: any) {
    this.url = url
    this.i = obj.i
    this.j = obj.j
    this.cells = obj.cells
    this.characters = obj.characters
    this.items = obj.items
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

/** {@linkcode FieldBlock} represents a block of a field */
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
  #items: Item[]
  #characters: Character[]
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
        cell.href
          ? Array.isArray(cell.href) ? cell.href : [cell.href]
          : undefined,
      )
    }
    this.#field = map.field
    this.#items = map.items
    this.#characters = []
    this.#loadImage = loadImage
    this.#map = map
  }

  loadCellImage(href: string): Promise<ImageBitmap> {
    return this.#loadImage(
      new URL(href, this.#map.url).href,
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

  async loadAssets() {
    await void 0 // Placeholder for future asset loading logic
    this.#assetsReady = true
  }

  get assetsReady(): boolean {
    return this.#assetsReady
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
    for (let jj = 0; jj < gridHeight; jj++) {
      for (let ii = 0; ii < gridWidth; ii++) {
        this.drawCell(layer, i + ii, j + jj)
      }
    }
    return canvas.getContext("2d")!.getImageData(
      CELL_SIZE * i,
      CELL_SIZE * j,
      CELL_SIZE * gridWidth,
      CELL_SIZE * gridHeight,
    )
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

  drawCell(layer: CanvasWrapper, i: number, j: number) {
    const cell = this.get(i, j)
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
    const rng = seedrandom(`${worldI}.${worldJ}`)
    let color: string
    if (cell.canEnter()) {
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

  renderAllChuncks() {
    const wrapper = new CanvasWrapper(this.canvas)
    for (let k = 0; k < BLOCK_SIZE / BLOCK_CHUNK_SIZE; k++) {
      for (let l = 0; l < BLOCK_SIZE / BLOCK_CHUNK_SIZE; l++) {
        this.#renderChunk(wrapper, k, l)
          .catch((error) => {
            console.error("Failed to render chunk", k, l, error)
          })
      }
    }
  }

  renderNeighborhood(
    i: number,
    j: number,
  ) {
    const wrapper = new CanvasWrapper(this.canvas)

    // The max of screen size is 450px (about 28.125 cells = 1.40625 chunks)
    // Let's calculate the overlap with 2 chunks square around the center cell.

    const k0 = ceilN(i - this.#i - BLOCK_CHUNK_SIZE, BLOCK_CHUNK_SIZE) /
      BLOCK_CHUNK_SIZE
    const l0 = ceilN(j - this.#j - BLOCK_CHUNK_SIZE, BLOCK_CHUNK_SIZE) /
      BLOCK_CHUNK_SIZE

    for (let l = l0; l < l0 + 2; l++) {
      if (l < 0 || l >= BLOCK_SIZE / BLOCK_CHUNK_SIZE) {
        continue // Out of bounds
      }
      for (let k = k0; k < k0 + 2; k++) {
        if (k < 0 || k >= BLOCK_SIZE / BLOCK_CHUNK_SIZE) {
          continue // Out of bounds
        }
        this.#renderChunk(wrapper, k, l)
          .catch((error) => {
            console.error("Failed to render chunk", k, l, error)
          })
      }
    }
  }

  async #renderChunk(
    layer: CanvasWrapper,
    k: number,
    l: number,
  ): Promise<void> {
    console.log("Rendering chunk", this.id, k, l)
    const chunkKey = `${k}.${l}`
    const chunkState = this.#chunks[chunkKey]
    if (chunkState === true || chunkState === "loading") {
      return
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
    }
    worker.postMessage({
      url: this.#map.url,
      obj: this.toMap(),
      i: k * BLOCK_CHUNK_SIZE,
      j: l * BLOCK_CHUNK_SIZE,
      gridWidth: BLOCK_CHUNK_SIZE,
      gridHeight: BLOCK_CHUNK_SIZE,
    })
    await render.promise
    return
  }

  get(i: number, j: number): FieldCell {
    return this.#cellMap[this.#field[j][i]]
  }
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
        canEnter: cell.canEnter(),
        color: cell.color,
        href: cell.src
          ? cell.src.length === 1 ? cell.src[0] : cell.src
          : undefined,
      })),
      characters: this.#characters,
      items: this.#items,
      field: this.#field,
    })
  }

  /**
   * Returns the difference between this block and the other block.
   */
  diff(other: FieldBlock): [i: number, j: number, cell: string][] {
    const diff: [i: number, j: number, cell: string][] = []
    for (let j = 0; j < BLOCK_SIZE; j++) {
      for (let i = 0; i < BLOCK_SIZE; i++) {
        const name = other.get(i, j).name
        if (this.get(i, j).name !== name) {
          diff.push([i, j, name])
        }
      }
    }
    return diff
  }
}
