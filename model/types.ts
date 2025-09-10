export type ILoader = {
  loadAssets(): Promise<void>
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

export type ObjectType = "chair" | "table"

export type IObject = IDrawable & {
  id: string | null
  type: ObjectType
}

export type IField = {
  canEnter(i: number, j: number): boolean
  peekItem(i: number, j: number): IItem | undefined
  collectItem(i: number, j: number): void
}

/** The implementor of 'step' function */
export type IStepper = { step(field: IField): void }

/** The interface represents a character */
export type IActor =
  & IDrawable
  & IStepper
  & {
    get id(): string
    get physicalGridKey(): string
  }
