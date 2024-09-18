import { signal } from "@kt3k/cell"
import { CELL_SIZE } from "./constants.ts"

// The current frame per second (fps)
export const fpsSignal = signal(0)
// The center of the view scope
export const viewScopeSignal = signal({ x: 0, y: 0 })
// The current loading state
export const isLoadingSignal = signal(true)
// The center pixel coordinate
export const centerPixelSignal = signal({ x: 0, y: 0 })
// The center grid coordinate
export const centerGridSignal = signal({ i: 0, j: 0 })

centerPixelSignal.subscribe(({ x, y }) => {
  centerGridSignal.updateByFields({
    i: Math.floor(x / CELL_SIZE),
    j: Math.floor(y / CELL_SIZE),
  })
})
