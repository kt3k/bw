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

export type IColorBox = IBox & {
  color: string
}

export type IEntity = IBox & ILoader & {
  i: number
  j: number
  image(): ImageBitmap
}

export type ItemType = "apple" | "green-apple" | "mushroom" | "purple-mushroom"

export type IItem = IEntity & {
  id: string | null
  onCollect(actor: IActor, field: IField): void
}

export type PropType = "stool" | "table"

export type IProp =
  & IEntity
  & IStepper
  & FieldEventTarget
  & {
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
  spawnActor(type: string, i: number, j: number, dir: Dir): IActor | null
  collectItem(i: number, j: number): void
  actors: {
    iter(): Iterable<IActor>
    /** This method is slow */
    get(i: number, j: number): IActor[]
    add(actor: IActor): void
  }
  props: {
    get(i: number, j: number): IProp | undefined
    remove(i: number, j: number): void
  }
  effects: {
    add(effect: IColorBox & IStepper & IFinishable): void
  }
  get time(): number
  colorCell(i: number, j: number, color: string): void
}

/** The implementor of 'step' function */
export type IStepper = { step(field: IField): void }

export type IFinishable = {
  readonly finished: boolean
}

export type FieldEvent = {
  type: "bounced"
  dir: "up" | "down" | "left" | "right"
  peakAt: number
}

export type PushedEvent = {
  type: "pushed"
  dir: Dir
  peakAt: number
}

export type FieldEventTarget = {
  onPushed(event: PushedEvent, field: IField): void
}

/** The interface represents a character */
export type IActor =
  & IEntity
  & IStepper
  & FieldEventTarget
  & {
    get id(): string
    get physicalGridKey(): string
    get dir(): Dir
    canGo(dir: Dir, field: IField): boolean
    enqueueActions(...actions: Action[]): void
    clearActionQueue(): void
  }

export type CommonMove = {
  type: "move" | "bounce" | "jump"
  x: number
  y: number
  step(): void
  finished: boolean
  halfPassed: boolean
  cb?: (move: Move) => void
}
export type Move =
  & CommonMove
  & ({
    type: "move"
    dir: Dir
  } | {
    type: "bounce"
    dir: Dir
    pushedActors: boolean
  } | {
    type: "jump"
  })

export type MoveAction =
  & {
    readonly cb?: (move: Move) => void
    move?: Move
    isFinished?: boolean
  }
  & (
    | { readonly type: "go"; readonly dir: Dir }
    | { readonly type: "slide"; readonly dir: Dir }
    | { readonly type: "jump" }
  )

export type Action =
  | MoveAction
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
