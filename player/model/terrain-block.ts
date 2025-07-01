import { CanvasWrapper } from "../../util/canvas-wrapper.ts"
import { BLOCK_SIZE, CELL_SIZE } from "../../util/constants.ts"
import { seedrandom } from "../../util/random.ts"
import type { Character } from "./character.ts"
import type { Item } from "./item.ts"

/**
 * TerrainCell represents the cell in the terrain block
 */
export class TerrainBlockCell {
  #color?: string
  #href?: string
  #canEnter: boolean
  #name: string
  constructor(name: string, canEnter: boolean, color?: string, href?: string) {
    this.#name = name
    this.#canEnter = canEnter
    this.#color = color
    this.#href = href
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
  get href(): string | undefined {
    return this.#href
  }
}

/**
 * Map represents the map of terrain
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
    href?: string
  }[]
  characters: {}[]
  items: Item[]
  terrain: string[]
  #obj: any
  // deno-lint-ignore no-explicit-any
  constructor(url: string, obj: any) {
    this.url = url
    this.i = obj.i
    this.j = obj.j
    this.cells = obj.cells
    this.characters = obj.characters
    this.items = obj.items
    this.terrain = obj.terrain
    this.#obj = obj
  }

  clone(): BlockMap {
    return new BlockMap(this.url, structuredClone(this.#obj))
  }

  toObject(): any {
    return this.#obj
  }
}

/** TerrainBlock represents a block of a terrain */
export class TerrainBlock {
  #x: number
  #y: number
  #w: number
  #h: number
  // The column of the world coordinates
  #i: number
  // The row of the world coordinates
  #j: number
  #cellMap: Record<string, TerrainBlockCell> = {}
  #imgMap: Record<string, HTMLImageElement> = {}
  #items: Item[]
  #characters: Character[]
  #terrain: string[]
  #loadImage: (url: string) => Promise<HTMLImageElement>
  #map: BlockMap

  constructor(
    map: BlockMap,
    loadImage: (url: string) => Promise<HTMLImageElement>,
  ) {
    this.#i = map.i
    this.#j = map.j
    this.#x = this.#i * CELL_SIZE
    this.#y = this.#j * CELL_SIZE
    this.#h = BLOCK_SIZE * CELL_SIZE
    this.#w = BLOCK_SIZE * CELL_SIZE
    for (const cell of map.cells) {
      this.#cellMap[cell.name] = new TerrainBlockCell(
        cell.name,
        cell.canEnter,
        cell.color,
        cell.href,
      )
    }
    this.#terrain = map.terrain
    this.#items = map.items
    this.#characters = []
    this.#loadImage = loadImage
    this.#map = map
  }

  loadCellImage(href: string): Promise<HTMLImageElement> {
    return this.#loadImage(
      new URL(href, this.#map.url).href,
    )
  }

  clone(): TerrainBlock {
    return new TerrainBlock(this.#map.clone(), this.#loadImage)
  }

  get id(): string {
    return `${this.#i}.${this.#j}`
  }

  get cells(): TerrainBlockCell[] {
    return Object.values(this.#cellMap)
  }

  get cellMap(): Record<string, TerrainBlockCell> {
    return this.#cellMap
  }

  async loadAssets() {
    await Promise.all(
      Object.values(this.#cellMap).map(async (cell) => {
        if (cell.href) {
          this.#imgMap[cell.href] = await this.loadCellImage(cell.href)
        }
      }),
    )
  }

  createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas")
    canvas.style.position = "absolute"
    canvas.style.left = `${this.x}px`
    canvas.style.top = `${this.y}px`
    canvas.width = this.w
    canvas.height = this.h
    canvas.classList.add("crisp-edges")
    this.#renderBlock(new CanvasWrapper(canvas))
    return canvas
  }

  drawCell(layer: CanvasWrapper, i: number, j: number) {
    const cell = this.get(i, j)
    if (cell.href) {
      layer.drawImage(this.#imgMap[cell.href], i * CELL_SIZE, j * CELL_SIZE)
    } else {
      layer.drawRect(
        i * CELL_SIZE,
        j * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
        cell.color || "black",
      )
    }
    if (!cell.canEnter()) {
      return
    }
    const worldI = this.#i + i
    const worldJ = this.#j + j
    const rng = seedrandom(`${worldI}.${worldJ}`)
    const choice = (arr: number[]) => arr[Math.floor(rng() * arr.length)]
    const color = `hsla(90, 100%, 50%, ${choice([0.1, 0.2])})`
    layer.drawRect(
      i * CELL_SIZE,
      j * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE,
      color,
    )
  }

  #renderBlock(layer: CanvasWrapper) {
    for (let j = 0; j < BLOCK_SIZE; j++) {
      for (let i = 0; i < BLOCK_SIZE; i++) {
        this.drawCell(layer, i, j)
      }
    }
  }

  get(i: number, j: number): TerrainBlockCell {
    return this.#cellMap[this.#terrain[j][i]]
  }
  update(i: number, j: number, cell: string): void {
    this.#terrain[j] = this.#terrain[j].substring(0, i) + cell +
      this.#terrain[j].substring(i + 1)
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
        href: cell.href,
      })),
      characters: this.#characters,
      items: this.#items,
      terrain: this.#terrain,
    })
  }

  /**
   * Returns the difference between this block and the other block.
   */
  diff(other: TerrainBlock): [i: number, j: number, cell: string][] {
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
