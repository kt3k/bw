import { DOWN, LEFT, RIGHT, UP } from "./dir.ts"

export function getDistance(current: Touch, prev: Touch) {
  const x = current.screenX - prev.screenX
  const y = current.screenY - prev.screenY
  return Math.sqrt(x ** 2 + y ** 2)
}

export function getDir(current: Touch, prev: Touch) {
  const x = current.screenX - prev.screenX
  const y = current.screenY - prev.screenY
  const theta = Math.atan2(y, x)

  if (Math.PI / 4 <= theta && theta < 3 * Math.PI / 4) {
    return DOWN
  } else if (-Math.PI / 4 <= theta && theta < Math.PI / 4) {
    return RIGHT
  } else if (-3 * Math.PI / 4 <= theta && theta < -Math.PI / 4) {
    return UP
  } else {
    return LEFT
  }
}
