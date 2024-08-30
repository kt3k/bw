import { WeakValueMap } from "@kt3k/weak-value-map"

function loadImage_(path: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve(img)
    }
    img.onerror = (e) => {
      reject(e)
    }
    img.src = path
  })
}

/**
 * Load a image from a path.
 * It caches the promise of the loading image. If the image is used somewhere in the system,
 * it will be returned from the cached promise.
 */
export const loadImage = memoizedLoading(loadImage_)

function memoizedLoading<K, A extends WeakKey>(
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
