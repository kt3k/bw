/**
 * Models for BW
 *
 * @module models
 */

import { loadImage } from "../util/load.ts"
import type { Input } from "../util/dir.ts"
import { type Dir, DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import { CanvasLayer } from "../util/canvas-layer.ts"
import { BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"
import { seedrandom } from "../util/random.ts"

type CharacterAppearance =
  | "up0"
  | "up1"
  | "down0"
  | "down1"
  | "left0"
  | "left1"
  | "right0"
  | "right1"

type CharacterAssets = {
  [K in CharacterAppearance]: HTMLImageElement
}

/** The character */
export class Character {
  /** The current direction of the character */
  #dir: Dir = "down"
  /** The column of the world coordinates */
  #i: number
  /** The row of the world coordinates */
  #j: number
  /** The distance of the current movement */
  #d: number = 0
  /** The speed of the move */
  #speed: 1 | 2 | 4 | 8 | 16 = 1
  /** True when moving, false otherwise */
  #isMoving: boolean = false
  /** The phase of the move */
  #movePhase: number = 0
  /** Type of the move */
  #moveType: "linear" | "bounce" = "linear"
  /** The prefix of assets */
  #assetPrefix: string
  /** The images necessary to render this character */
  #assets?: CharacterAssets

  constructor(
    i: number,
    j: number,
    speed: 1 | 2 | 4 | 8 | 16,
    assetPrefix: string,
  ) {
    this.#i = i
    this.#j = j
    this.#speed = speed
    this.#assetPrefix = assetPrefix
  }

  setState(state: Dir) {
    this.#dir = state
  }

  #readInput(input: typeof Input) {
    if (input.up) {
      this.setState(UP)
    } else if (input.down) {
      this.setState(DOWN)
    } else if (input.left) {
      this.setState(LEFT)
    } else if (input.right) {
      this.setState(RIGHT)
    }
  }

  /** Returns the grid coordinates of the 1 cell front of the character. */
  front(): [i: number, j: number] {
    if (this.#dir === UP) {
      return [this.#i, this.#j - 1]
    } else if (this.#dir === DOWN) {
      return [this.#i, this.#j + 1]
    } else if (this.#dir === LEFT) {
      return [this.#i - 1, this.#j]
    } else {
      return [this.#i + 1, this.#j]
    }
  }

  step(
    input: typeof Input,
    terrain: { get(i: number, j: number): TerrainBlockCell },
  ) {
    if (
      this.#movePhase === 0 &&
      (input.up || input.down || input.left || input.right)
    ) {
      this.#isMoving = true
      this.#readInput(input)
      const [i, j] = this.front()
      const cell = terrain.get(i, j)

      if (cell.canEnter()) {
        this.#moveType = "linear"
      } else {
        this.#moveType = "bounce"
      }
    }

    if (this.#isMoving) {
      if (this.#moveType === "linear") {
        this.#movePhase += this.#speed
        this.#d += this.#speed
        if (this.#movePhase == 16) {
          this.#movePhase = 0
          this.#isMoving = false
          this.#d = 0
          if (this.#dir === UP) {
            this.#j -= 1
          } else if (this.#dir === DOWN) {
            this.#j += 1
          } else if (this.#dir === LEFT) {
            this.#i -= 1
          } else if (this.#dir === RIGHT) {
            this.#i += 1
          }
        }
      } else if (this.#moveType === "bounce") {
        this.#movePhase += this.#speed
        if (this.#movePhase < 8) {
          this.#d += this.#speed / 2
        } else {
          this.#d -= this.#speed / 2
        }
        if (this.#movePhase == 16) {
          this.#movePhase = 0
          this.#isMoving = false
          this.#d = 0
        }
      }
    }
  }

  image(): HTMLImageElement {
    if (this.#movePhase >= 8) {
      // active state
      return this.#assets![`${this.#dir}1`]
    } else {
      // idle state
      return this.#assets![`${this.#dir}0`]
    }
  }

  /** Gets the x of the world coordinates */
  get x(): number {
    if (this.#dir === LEFT) {
      return this.#i * CELL_SIZE - this.#d
    } else if (this.#dir === RIGHT) {
      return this.#i * CELL_SIZE + this.#d
    } else {
      return this.#i * CELL_SIZE
    }
  }

  get centerX(): number {
    return this.x + CELL_SIZE / 2
  }

  /** Gets the y of the world coordinates */
  get y(): number {
    if (this.#dir === UP) {
      return this.#j * CELL_SIZE - this.#d
    } else if (this.#dir === DOWN) {
      return this.#j * CELL_SIZE + this.#d
    } else {
      return this.#j * CELL_SIZE
    }
  }

  get h(): number {
    return CELL_SIZE
  }

  get w(): number {
    return CELL_SIZE
  }

  get centerY(): number {
    return this.y + CELL_SIZE / 2
  }

  /**
   * Loads the assets and store resulted HTMLImageElement in the fields.
   * Assets are managed like this way to make garbage collection easier.
   */
  async loadAssets() {
    const [up0, up1, down0, down1, left0, left1, right0, right1] = await Promise
      .all([
        `${this.#assetPrefix}up0.png`,
        `${this.#assetPrefix}up1.png`,
        `${this.#assetPrefix}down0.png`,
        `${this.#assetPrefix}down1.png`,
        `${this.#assetPrefix}left0.png`,
        `${this.#assetPrefix}left1.png`,
        `${this.#assetPrefix}right0.png`,
        `${this.#assetPrefix}right1.png`,
      ].map(loadImage))
    this.#assets = {
      up0,
      up1,
      down0,
      down1,
      left0,
      left1,
      right0,
      right1,
    }
  }

  get assetsReady(): boolean {
    return !!this.#assets
  }
}

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

/** Item represents the item in the terrain */
export class Item {}

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
  items: {}[]
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
    this.#renderBlock(new CanvasLayer(canvas))
    return canvas
  }

  drawCell(layer: CanvasLayer, i: number, j: number) {
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

  #renderBlock(layer: CanvasLayer) {
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
