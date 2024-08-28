import { WeakRefCache } from "./weak-ref-cache.ts"

const weakRefCache = new WeakRefCache<string, Promise<HTMLImageElement>>()
const weakMap = new WeakMap<HTMLImageElement, Promise<HTMLImageElement>>()

/** Load a image from a path.
 * It caches the promise of the loading image. If the image is used somewhere in the system,
 * it will be returned from the cached promise.
 */
export async function loadImage(path: string): Promise<HTMLImageElement> {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  const cached = weakRefCache.get(path)
  if (cached) {
    return cached
  }
  const img = new Image()
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => {
      resolve(img)
    }
    img.onerror = (e) => {
      reject(e)
    }
    img.src = path
  })
  // Create a weak map from the image to the promise
  // This prevents the promise from being garbage collected
  // as long as the image is being used
  weakMap.set(img, promise)
  // Cache the promise by the path
  weakRefCache.set(path, promise)
  return promise
}
