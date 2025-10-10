export type LoadOptions = {
  loadImage?: (url: string) => Promise<ImageBitmap>
  loadJson?: (url: string) => unknown
}

export type ILoader = {
  loadAssets(
    opts?: LoadOptions,
  ): Promise<void>
  get assetsReady(): boolean
}

/** The interface represents a box */
export type IBox = {
  get x(): number
  get y(): number
  get w(): number
  get h(): number
}

export type IDrawable = IBox & ILoader & {
  i: number
  j: number
  image(): ImageBitmap
}

export type ItemType = "apple" | "green-apple" | "mushroom" | "purple-mushroom"

export type IItem = IDrawable & {
  id: string | null
  type: ItemType
}

export type ObjectType = "stool" | "table"

export type IObject = IDrawable & {
  id: string | null
  type: ObjectType
  canEnter: boolean
}

export type IField = {
  canEnter(i: number, j: number): boolean
  peekItem(i: number, j: number): IItem | undefined
  collectItem(i: number, j: number): void
  actors: {
    iter(): Iterable<IActor>
    /** This method is slow */
    get(i: number, j: number): IActor[]
  }
  get time(): number
}

/** The implementor of 'step' function */
export type IStepper = { step(field: IField): void }

export type ActorEvent = { type: "green-apple-collected" } | {
  type: "bounced"
  dir: "up" | "down" | "left" | "right"
}

/** The interface represents a character */
export type IActor =
  & IDrawable
  & IStepper
  & {
    get id(): string
    get physicalGridKey(): string
    onEvent(event: ActorEvent, field: IField): void
  }
