import { BlockMap, FieldBlock } from "../model/field-block.ts"
import { loadImage } from "../util/load.ts"
import { BLOCK_CHUNK_SIZE, CELL_SIZE } from "../util/constants.ts"

addEventListener("message", async (event) => {
  const start = performance.now()
  const { url, obj, k, l } = event.data
  const blockMap = new BlockMap(url, obj)
  const fieldBlock = new FieldBlock(blockMap, loadImage)
  await fieldBlock.loadCellImages()
  const canvas = fieldBlock.renderChunkInOffscreenCanvas(k, l)
  const imageData = canvas.getContext("2d")!.getImageData(
    BLOCK_CHUNK_SIZE * CELL_SIZE * k,
    BLOCK_CHUNK_SIZE * CELL_SIZE * l,
    BLOCK_CHUNK_SIZE * CELL_SIZE,
    BLOCK_CHUNK_SIZE * CELL_SIZE,
  )
  console.log("Canvas worker: Image data prepared", {
    k,
    l,
    width: imageData.width,
    height: imageData.height,
    elapsed: (performance.now() - start).toFixed(0) + "ms",
  })
  postMessage({
    imageData,
  })
})
