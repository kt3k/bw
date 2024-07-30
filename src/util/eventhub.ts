import mitt_ from "mitt"

// deno-lint-ignore no-explicit-any
const mitt = mitt_ as any as typeof import("mitt").default

export const VIEW_SCOPE_MOVE = "view-move"
export const FPS = "fps"

export const eventHub = mitt<{
  [VIEW_SCOPE_MOVE]: { x: number; y: number }
  [FPS]: number
}>()
