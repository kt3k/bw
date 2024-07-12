import type { Context } from "@kt3k/cell"
import { Input } from "./KeyMonitor.ts"

export function DPad({ on }: Context) {
  on(".up").mousedown = () => Input.up = true
  on(".up").mouseout = () => Input.up = false
  on(".up").mouseup = () => Input.up = false
  on(".left").mousedown = () => Input.left = true
  on(".left").mouseout = () => Input.left = false
  on(".left").mouseup = () => Input.left = false
  on(".right").mousedown = () => Input.right = true
  on(".right").mouseout = () => Input.right = false
  on(".right").mouseup = () => Input.right = false
  on(".down").mousedown = () => Input.down = true
  on(".down").mouseout = () => Input.down = false
  on(".down").mouseup = () => Input.down = false
}
