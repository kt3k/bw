import { createImageDataForRange } from "../model/field-block.ts"

addEventListener("message", (event) => {
  const start = performance.now()
  const { cells, imgMap, i, j, gridWidth, gridHeight, field } = event.data
  const imageData = createImageDataForRange(
    i,
    j,
    gridWidth,
    gridHeight,
    cells,
    imgMap,
    field,
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
