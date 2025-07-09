import { BlockMap, FieldBlock } from "../model/field-block.ts"
import { loadImage } from "../util/load.ts"

addEventListener("message", async (event) => {
  const start = performance.now()
  const { url, obj } = event.data
  const blockMap = new BlockMap(url, obj)
  const fieldBlock = new FieldBlock(blockMap, loadImage)
  await fieldBlock.loadCellImages()
  const canvas = fieldBlock.renderInOffscreenCanvas()
  const imageData = canvas.getContext("2d")!.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  )
  console.log("Canvas worker: Image data prepared", {
    width: imageData.width,
    height: imageData.height,
    elapsed: (performance.now() - start).toFixed(0) + "ms",
  })
  postMessage({
    imageData,
  })
})
