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
