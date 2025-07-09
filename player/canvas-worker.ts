import { BlockMap, FieldBlock } from "../model/field-block.ts"
import { loadImage } from "../util/load.ts"
import { CELL_SIZE } from "../util/constants.ts"

addEventListener("message", async (event) => {
  const start = performance.now()
  const { url, obj, i, j, gridWidth, gridHeight } = event.data
  const blockMap = new BlockMap(url, obj)
  const fieldBlock = new FieldBlock(blockMap, loadImage)
  await fieldBlock.loadCellImages()
  const canvas = fieldBlock.renderRangeInOffscreenCanvas(
    i,
    j,
    gridWidth,
    gridHeight,
  )
  const imageData = canvas.getContext("2d")!.getImageData(
    CELL_SIZE * i,
    CELL_SIZE * j,
    CELL_SIZE * gridWidth,
    CELL_SIZE * gridHeight,
  )
  console.log("Canvas worker: Image data prepared", {
    i: i,
    j: j,
    width: imageData.width,
    height: imageData.height,
    elapsed: (performance.now() - start).toFixed(0) + "ms",
  })
  postMessage({
    imageData,
  })
})
