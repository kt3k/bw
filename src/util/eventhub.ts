import mitt_ from "mitt"

// deno-lint-ignore no-explicit-any
const mitt = mitt_ as any as typeof import("mitt").default

export const eventHub = mitt<{
  move: { x: number; y: number }
  fps: number
}>()
