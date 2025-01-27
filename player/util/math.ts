/** Floors the given number to the multiple of the given n */
export function floorN(x: number, n: number): number {
  return Math.floor(x / n) * n
}

/** Ceils the given number to the multiple of the given n */
export function ceilN(x: number, n: number): number {
  return Math.ceil(x / n) * n
}

/** Returns x modulo m */
export function modulo(x: number, m: number): number {
  const r = x % m
  return r >= 0 ? r : r + m
}
