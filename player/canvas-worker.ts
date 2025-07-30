import { BlockMap, FieldBlock } from "../model/field-block.ts"
import { loadImage } from "../util/load.ts"

addEventListener("message", async (event) => {
  const start = performance.now()
  const { url, obj, i, j, gridWidth, gridHeight } = event.data
  console.log("obj", obj)
  const blockMap = new BlockMap(url, obj)
  const fieldBlock = new FieldBlock(blockMap, loadImage)
  await fieldBlock.loadCellImages()
  const imageData = fieldBlock.createImageDataForRange(
    i,
    j,
    gridWidth,
    gridHeight,
  )
  console.log("Canvas worker: Image data prepared", {
    i,
    j,
    gridWidth,
    gridHeight,
    elapsed: (performance.now() - start).toFixed(0) + "ms",
  })
  postMessage({
    imageData,
  })
})
