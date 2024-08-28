/** Cache values as long as it's not garbage-collected */
export class WeakRefCache<K, V extends WeakKey> implements Map<K, V> {
  readonly #cache = new Map<K, WeakRef<V>>()
  readonly #registry: FinalizationRegistry<K>;
  [Symbol.toStringTag] = "WeakRefCache"

  constructor() {
    this.#registry = new FinalizationRegistry((key) => {
      this.#cache.delete(key)
    })
  }

  clear(): void {
    for (const key of this.keys()) {
      this.delete(key)
    }
  }

  delete(key: K): boolean {
    const ref = this.#cache.get(key)

    if (ref) {
      this.#cache.delete(key)
      this.#registry.unregister(ref)
      return true
    }
    return false
  }

  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    // deno-lint-ignore no-explicit-any
    thisArg?: any,
  ): void {
    this.#cache.forEach((ref, k) => {
      callbackfn(ref.deref()!, k, thisArg)
    })
  }

  get(key: K): V | undefined {
    return this.#cache.get(key)?.deref()
  }

  has(key: K): boolean {
    return this.#cache.has(key)
  }

  set(key: K, value: V): this {
    const ref = new WeakRef(value)
    this.#cache.set(key, ref)
    this.#registry.register(value, key, ref)
    return this
  }

  get size() {
    return this.#cache.size
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries()
  }

  *entries(): IterableIterator<[K, V]> {
    for (const [k, v] of this.#cache.entries()) {
      yield [k, v.deref()!]
    }
  }

  keys(): IterableIterator<K> {
    return this.#cache.keys()
  }

  *values(): IterableIterator<V> {
    for (const v of this.#cache.values()) {
      yield v.deref()!
    }
  }
}
