import { BlockMap, FieldBlock } from "../model/field-block.ts"
import { loadImage } from "../util/load.ts"

addEventListener("message", async (event) => {
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
  postMessage({
    imageData,
  })
})
