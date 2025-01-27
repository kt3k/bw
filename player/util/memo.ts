import { WeakValueMap } from "@kt3k/weak-value-map"

export function memoizedLoading<K, A extends WeakKey>(
  fn: (key: K) => Promise<A>,
): (key: K) => Promise<A> {
  const weakValueMap = new WeakValueMap<K, Promise<A>>()
  const weakKeyMap = new WeakMap<A, Promise<A>>()
  return (key: K) => {
    const cache = weakValueMap.get(key)
    if (cache) {
      return cache
    }
    const promise = fn(key)
    // Cache the promise by the key
    weakValueMap.set(key, promise)
    promise.then((value) => {
      // Create a weak map from the asest to the loading promise.
      // This prevents the promise from being garbage collected
      // as long as the asset is being used
      weakKeyMap.set(value, promise)
    })
    return promise
  }
}
