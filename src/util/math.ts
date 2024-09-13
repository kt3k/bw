/** Floors the given number to the multiple of the given n */
export function floorN(x: number, n: number) {
  return Math.floor(x / n) * n
}

/** Ceils the given number to the multiple of the given n */
export function ceilN(x: number, n: number) {
  return Math.ceil(x / n) * n
}
