import { memoizedLoading } from "./memo.ts"

async function loadImage_(path: string): Promise<ImageBitmap> {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`Failed to load image from ${path}: ${res.statusText}`)
  }
  const blob = await res.blob()
  return createImageBitmap(blob)
}

/**
 * Load a image from a path.
 * It caches the promise of the loading image. If the image is used somewhere in the system,
 * it will be returned from the cached promise.
 */
export const loadImage = memoizedLoading(loadImage_)
