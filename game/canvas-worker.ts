import { BlockMap, FieldBlock } from "../model/field-block.ts"
import { Catalog } from "../model/catalog.ts"

addEventListener("message", (event) => {
  const start = performance.now()
  const { url, obj, imgMap, i, j, gridWidth, gridHeight } = event.data
  const blockMap = new BlockMap(url, obj, new Catalog())
  const fieldBlock = new FieldBlock(blockMap)
  const imageData = fieldBlock.createImageDataForRange(
    i,
    j,
    gridWidth,
    gridHeight,
    imgMap,
  )
  console.log("Canvas worker: Image data prepared", {
    i,
    j,
    gridWidth,
    gridHeight,
    elapsed: (performance.now() - start).toFixed(0) + "ms",
  })
  postMessage({ imageData })
})
