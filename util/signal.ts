import { GroupSignal, Signal } from "@kt3k/cell"
import { CELL_SIZE } from "./constants.ts"

// The current frame per second (fps)
export const fpsSignal = new Signal(0)
// The current count of apples
export const appleCountSignal = new Signal(0)
// The center of the view scope
export const viewScopeSignal = new GroupSignal({ x: 0, y: 0 })
// The current loading state
export const isLoadingSignal = new Signal(true)
// The center pixel coordinate
export const centerPixelSignal = new GroupSignal({ x: 0, y: 0 })
// The center grid coordinate
export const centerGridSignal = centerPixelSignal.map(({ x, y }) => ({
  i: Math.floor(x / CELL_SIZE),
  j: Math.floor(y / CELL_SIZE),
}))

export const centerGrid10Signal = centerGridSignal.map(({ i, j }) => ({
  i: Math.floor(i / 10) * 10,
  j: Math.floor(j / 10) * 10,
}))
