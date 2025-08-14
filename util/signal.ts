import { GroupSignal, Signal } from "@kt3k/cell"
import { CELL_SIZE } from "./constants.ts"

// The current frame per second (fps)
export const fps = new Signal(0)
// The current number of actors
export const actorsCount = new Signal(0)
// The current count of apples
export const appleCount = new Signal(0)
// The current count of green apples
export const greenAppleCount = new Signal(0)
// The current loading state
export const isGameLoading = new Signal(true)
// The center pixel coordinate
export const centerPixel = new GroupSignal({ x: 0, y: 0 })
// The center grid coordinate
export const centerGrid = centerPixel.map(({ x, y }) => ({
  i: Math.floor(x / CELL_SIZE),
  j: Math.floor(y / CELL_SIZE),
}))

export const centerGrid10 = centerGrid.map(({ i, j }) => ({
  i: Math.floor(i / 10) * 10,
  j: Math.floor(j / 10) * 10,
}))
