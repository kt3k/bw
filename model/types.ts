export type Dir = "up" | "down" | "left" | "right"
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

export type IEntity = IBox & ILoader & {
  i: number
  j: number
  image(): ImageBitmap
}

export type ItemType = "apple" | "green-apple" | "mushroom" | "purple-mushroom"

export type IItem = IEntity & {
  id: string | null
  type: ItemType
}

export type PropType = "stool" | "table"

export type IProp = IEntity & {
  id: string | null
  type: PropType
  canEnter: boolean
}

export type IField = {
  /** can enter the cell considering dynamic objects */
  canEnter(i: number, j: number): boolean
  /** can enter the cell without considering dynamic objects */
  canEnterStatic(i: number, j: number): boolean
  peekItem(i: number, j: number): IItem | undefined
  collectItem(i: number, j: number): void
  actors: {
    iter(): Iterable<IActor>
    /** This method is slow */
    get(i: number, j: number): IActor[]
    add(actor: IActor): void
  }
  get time(): number
  colorCell(i: number, j: number, color: string): void
}

/** The implementor of 'step' function */
export type IStepper = { step(field: IField): void }

export type FieldEvent = {
  type: "bounced"
  dir: "up" | "down" | "left" | "right"
  peakAt: number
}

export type FieldEventTarget = {
  onEvent(event: FieldEvent, field: IField): void
}

/** The interface represents a character */
export type IActor =
  & IEntity
  & IStepper
  & FieldEventTarget
  & {
    get id(): string
    get physicalGridKey(): string
    enqueueAction(...actions: Action[]): void
  }

export type Move = {
  type: "move" | "bounce" | "jump"
  x: number
  y: number
  step(): void
  finished: boolean
  halfPassed: boolean
}

export type MovePlan =
  & {
    readonly cb?: (move: Move) => void
  }
  & (
    | { readonly type: "go"; readonly dir: Dir }
    | { readonly type: "slide"; readonly dir: Dir }
    | { readonly type: "jump" }
  )

export type Action =
  | MovePlan
  | { readonly type: "go-random" }
  | { readonly type: "speed"; readonly change: "2x" | "4x" | "reset" }
  | {
    readonly type: "turn"
    readonly dir:
      | "north"
      | "south"
      | "west"
      | "east"
      | "left"
      | "right"
      | "back"
  }
  | { readonly type: "wait"; readonly until: number }
  | {
    readonly type: "splash"
    readonly hue: number
    readonly sat: number
    readonly light: number
    readonly alpha: number
    readonly radius: number
  }
