import { signal } from "@kt3k/cell"

// The current frame per second (fps)
export const fpsSignal = signal(0)
// The center of the view scope
export const viewScopeSignal = signal({ x: 0, y: 0 })
// The current loading state
export const isLoadingSignal = signal(true)
