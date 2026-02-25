export class GridMap<T> {
  #map = new Map<number, Map<number, T>>()

  has(i: number, j: number): boolean {
    return this.#map.get(i)?.has(j) ?? false
  }

  get(i: number, j: number): T | undefined {
    return this.#map.get(i)?.get(j)
  }

  set(i: number, j: number, value: T): GridMap<T> {
    let row = this.#map.get(i)
    if (!row) {
      row = new Map<number, T>()
      this.#map.set(i, row)
    }
    row.set(j, value)
    return this
  }

  delete(i: number, j: number): boolean {
    const row = this.#map.get(i)
    if (row) {
      const result = row.delete(j)
      if (row.size === 0) {
        this.#map.delete(i)
      }
      return result
    }
    return false
  }
}

export class GridSet<T> {
  #map = new GridMap<Set<T>>()

  has(i: number, j: number, value: T): boolean {
    return this.#map.get(i, j)?.has(value) ?? false
  }

  get(i: number, j: number): Set<T> | undefined {
    return this.#map.get(i, j)
  }

  getOne(i: number, j: number): T | undefined {
    return this.#map.get(i, j)?.values().next().value
  }

  add(i: number, j: number, value: T): GridSet<T> {
    let set = this.#map.get(i, j)
    if (!set) {
      set = new Set<T>()
      this.#map.set(i, j, set)
    }
    set.add(value)
    return this
  }

  delete(i: number, j: number, value: T): boolean {
    const set = this.#map.get(i, j)
    if (set) {
      const result = set.delete(value)
      if (set.size === 0) {
        this.#map.delete(i, j)
      }
      return result
    }
    return false
  }
}
