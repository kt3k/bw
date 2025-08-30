// Copyright 2024-2025 Yoshiya Hinosawa. MIT license.
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />
/// <reference types="@types/vscode-webview" />

const vscode = acquireVsCodeApi<{ uri: string; text: string }>()

import { BlockMap, FieldBlock } from "../model/field-block.ts"
import { floorN, modulo } from "../util/math.ts"
import { memoizedLoading } from "../util/memo.ts"
import { CanvasWrapper } from "../util/canvas-wrapper.ts"
import { type Context, GroupSignal, mount, register, Signal } from "@kt3k/cell"
import type * as type from "./types.ts"
import { BLOCK_SIZE } from "../util/constants.ts"

const blockMapSource = new GroupSignal({ uri: "", text: "" })
const fieldBlock = new Signal<FieldBlock | null>(null)
let prevFieldBlock: FieldBlock | null = null
const mode = new Signal<"dot" | "stroke">("dot")
const selectedCell = new Signal<number | null>(null)

blockMapSource.subscribe(({ uri, text }) => {
  if (uri === "" || text === "") {
    fieldBlock.update(null)
    return
  }
  fieldBlock.update(
    new FieldBlock(new BlockMap(uri, JSON.parse(text)), loadImage),
  )
})

function getGridFromUri(uri: string) {
  const m = uri.match(/block_(-?\d+)\.(-?\d+)\.json$/)
  if (!m) return { i: NaN, j: NaN }
  return { i: parseInt(m[1]), j: parseInt(m[2]) }
}

function MainContainer({ subscribe, el, query }: Context) {
  subscribe(fieldBlock, async (fieldBlock) => {
    const prev = prevFieldBlock
    prevFieldBlock = fieldBlock
    if (fieldBlock === null) return

    if (prev === null) {
      const FULL_SIZE = 3200
      const SIDE_CANVAS_SIZE = 80

      await fieldBlock.loadAssets()
      const canvas = fieldBlock.canvas
      canvas.style.left = SIDE_CANVAS_SIZE + "px"
      canvas.style.top = SIDE_CANVAS_SIZE + "px"
      canvas.style.position = "absolute"
      canvas.classList.add("field-block-canvas")
      el.innerHTML = ""
      el.appendChild(canvas)
      fieldBlock.renderAll()
      mount("field-block-canvas", el)

      const { i, j } = getGridFromUri(fieldBlock.toMap().url)
      const x = [
        [-1, 0],
        [0, -1],
        [0, 1],
        [1, 0],
      ]
      for (const [dx, dy] of x) {
        const k = i + dx * 200
        const l = j + dy * 200
        const href =
          new URL(`block_${k}.${l}.json`, blockMapSource.get().uri).href
        let text
        try {
          text = await loadText(href)
        } catch {
          text = await loadText(
            new URL("block_not_found.json", blockMapSource.get().uri).href,
          )
        }
        const blockMap = new BlockMap(href, JSON.parse(text))
        const fieldBlock = new FieldBlock(blockMap, loadImage)
        await fieldBlock.loadAssets()
        const a = document.createElement("a")
        a.href = href.replace(/^file:\/\//, "vscode://file")
        a.textContent = `block_${k}.${l}.json`
        a.classList.add(
          "absolute",
          "opacity-50",
          "hover:bg-neutral-700",
          "bg-neutral-800",
          "break-all",
        )
        if (dx === -1) {
          const imageData = fieldBlock.createImageDataForRange(
            BLOCK_SIZE - 5,
            0,
            5,
            BLOCK_SIZE,
          )
          const canvas = document.createElement("canvas")
          canvas.width = imageData.width
          canvas.height = imageData.height
          canvas.classList.add("absolute", "top-0", "left-0")
          const ctx = canvas.getContext("2d")!
          ctx.putImageData(imageData, 0, 0)
          a.appendChild(canvas)
          a.style.left = "0"
          a.style.top = SIDE_CANVAS_SIZE + "px"
          a.style.height = FULL_SIZE + "px"
          a.style.width = SIDE_CANVAS_SIZE + "px"
        } else if (dx === 1) {
          const imageData = fieldBlock.createImageDataForRange(
            0,
            0,
            5,
            BLOCK_SIZE,
          )
          const canvas = document.createElement("canvas")
          canvas.width = imageData.width
          canvas.height = imageData.height
          canvas.classList.add("absolute", "top-0", "left-0")
          const ctx = canvas.getContext("2d")!
          ctx.putImageData(imageData, 0, 0)
          a.appendChild(canvas)
          a.style.left = (FULL_SIZE + SIDE_CANVAS_SIZE) + "px"
          a.style.top = SIDE_CANVAS_SIZE + "px"
          a.style.height = FULL_SIZE + "px"
          a.style.width = SIDE_CANVAS_SIZE + "px"
        } else if (dy === -1) {
          const imageData = fieldBlock.createImageDataForRange(
            0,
            BLOCK_SIZE - 5,
            BLOCK_SIZE,
            5,
          )
          const canvas = document.createElement("canvas")
          canvas.width = imageData.width
          canvas.height = imageData.height
          canvas.classList.add("absolute", "top-0", "left-0")
          const ctx = canvas.getContext("2d")!
          ctx.putImageData(imageData, 0, 0)
          a.appendChild(canvas)
          a.style.top = "0"
          a.style.left = SIDE_CANVAS_SIZE + "px"
          a.style.width = FULL_SIZE + "px"
          a.style.height = SIDE_CANVAS_SIZE + "px"
        } else if (dy === 1) {
          const imageData = fieldBlock.createImageDataForRange(
            0,
            0,
            BLOCK_SIZE,
            5,
          )
          const canvas = document.createElement("canvas")
          canvas.width = imageData.width
          canvas.height = imageData.height
          canvas.classList.add("absolute", "top-0", "left-0")
          const ctx = canvas.getContext("2d")!
          ctx.putImageData(imageData, 0, 0)
          a.appendChild(canvas)
          a.style.top = (FULL_SIZE + SIDE_CANVAS_SIZE) + "px"
          a.style.left = SIDE_CANVAS_SIZE + "px"
          a.style.width = FULL_SIZE + "px"
          a.style.height = SIDE_CANVAS_SIZE + "px"
        }
        el.appendChild(a)
      }
      return
    }

    const diff = prev.diff(fieldBlock)
    if (diff.length === 0) {
      return
    }
    query(".field-block-canvas")?.dispatchEvent(
      new CustomEvent("diff", { detail: diff }),
    )
  })
}

function CellSwitch({ on, el, subscribe }: Context) {
  subscribe(fieldBlock, async (fieldBlock) => {
    if (fieldBlock === null) return
    const cells = await Promise.all(fieldBlock.cells.map(async (cell) => {
      let div = el.querySelector<HTMLDivElement>(
        '[name="' + cell.name + '"]',
      )
      if (div) {
        return div
      }
      div = document.createElement("div")
      div.classList.add("inline-block", "p-1", "m-1", "rounded")
      div.setAttribute("name", cell.name)
      const canvas = document.createElement("canvas")
      canvas.width = 16
      canvas.height = 16
      canvas.classList.add("pointer-events-none")
      if (cell.color) {
        canvas.style.backgroundColor = cell.color
      }
      if (cell.src) {
        for (const src of cell.src) {
          const img = await fieldBlock.loadCellImage(src)
          const ctx = canvas.getContext("2d")!
          ctx.drawImage(img, 0, 0, 16, 16)
        }
      }
      div.appendChild(canvas)
      return div
    }))
    cells.forEach((cell) => {
      if (!el.contains(cell)) {
        el.appendChild(cell)
      }
    })
    if (cells.length > 0 && selectedCell.get() === null) {
      selectedCell.update(0)
    }
  })
  subscribe(selectedCell, (index) => {
    const children = Array.from(el.children)
    const ACTIVE_CLASSES = ["bg-orange-400"]
    const ACTIVE_CANVAS_CLASSES = ["opacity-70"]
    children.forEach((child, i) => {
      const firstChild = child.firstChild as HTMLElement
      if (i === index) {
        child.classList.add(...ACTIVE_CLASSES)
        firstChild.classList.add(...ACTIVE_CANVAS_CLASSES)
      } else {
        child.classList.remove(...ACTIVE_CLASSES)
        firstChild.classList.remove(...ACTIVE_CANVAS_CLASSES)
      }
    })
  })
  on("click", (e) => {
    const index = Array.from(el.children).indexOf(e.target as HTMLElement)
    if (index >= 0) {
      selectedCell.update(index)
    }
  })
}

function ModeSwitch({ subscribe, el }: Context<HTMLElement>) {
  subscribe(mode, (mode) => el.textContent = mode)
}

function FieldBlockCanvas({ on, el }: Context<HTMLCanvasElement>) {
  const canvasWrapper = new CanvasWrapper(el)

  const paint = (e: MouseEvent) => {
    const { left, top } = el.getBoundingClientRect()
    const x = floorN(e.clientX - left, 16)
    const y = floorN(e.clientY - top, 16)
    const i = x / 16
    const j = y / 16
    const block = fieldBlock.get()
    if (block === null) return
    const cell = block.cells[selectedCell.get()!]
    const currentCell = block.getCell(i, j)
    if (!currentCell) return
    // The cell kind is already the same as selected cell
    if (currentCell.name === cell.name) return
    const b = block.clone()
    b.update(i, j, cell.name)
    fieldBlock.update(b)
    const map = b.toMap()
    vscode.postMessage({
      type: "update",
      map: map.toObject(),
    })
  }

  on("click", (e) => {
    paint(e)
  })

  on("mousemove", (e) => {
    if (mode.get() === "stroke") paint(e)
  })

  on("diff", async (e: CustomEvent<[i: number, j: number, name: string][]>) => {
    const diff = e.detail
    const block = fieldBlock.get()
    if (block === null) return
    // TODO(kt3k): this shouldn't be necessary
    await block.loadAssets()
    for (const [i, j] of diff) {
      block.drawCell(canvasWrapper, i, j)
    }
  })
}

function KeyHandler({ on }: Context) {
  on("keydown", (e) => {
    if (e.key === "k") {
      const currentCell = selectedCell.get()
      const block = fieldBlock.get()
      if (currentCell === null) return
      if (block === null) return
      selectedCell.update(modulo(currentCell + 1, block.cells.length))
      mode.update("dot")
    } else if (e.key === "j") {
      const currentCell = selectedCell.get()
      const block = fieldBlock.get()
      if (currentCell === null) return
      if (block === null) return
      selectedCell.update(modulo(currentCell - 1, block.cells.length))
      mode.update("dot")
    } else if (e.key === "s" && !e.altKey && !e.metaKey) {
      if (mode.get() === "dot") {
        mode.update("stroke")
      } else {
        mode.update("dot")
      }
    } else if (e.key === "Escape") {
      mode.update("dot")
    }
  })
}

type ResolveImage = (image: ImageBitmap) => void
const loadImageMap: Record<string, { resolve: ResolveImage }> = {}
const loadImage = memoizedLoading((uri: string) => {
  const { resolve, promise } = Promise.withResolvers<ImageBitmap>()
  const id = Math.random().toString()
  loadImageMap[id] = { resolve }
  vscode.postMessage({ type: "loadImage", uri, id })
  return promise
})
function onLoadImageResponse(message: type.Extension.MessageLoadImageResponse) {
  const image = new Image()
  image.src = message.text
  image.onload = () => {
    const bitmap = createImageBitmap(image)
    bitmap.then((bitmap) => {
      loadImageMap[message.id].resolve(bitmap)
      delete loadImageMap[message.id]
    })
  }
}

type ResolveText = (text: string) => void
type RejectText = (error: Error) => void
const loadTextMap: Record<
  string,
  { resolve: ResolveText; reject: RejectText }
> = {}
const loadText = (uri: string) => {
  const { resolve, reject, promise } = Promise.withResolvers<string>()
  const id = Math.random().toString()
  loadTextMap[id] = { resolve, reject }
  vscode.postMessage({ type: "loadText", uri, id })
  return promise
}
function onLoadTextResponse(message: type.Extension.MessageLoadTextResponse) {
  if ("text" in message) {
    const text = message.text
    loadTextMap[message.id].resolve(text)
  } else {
    const error = message.error
    loadTextMap[message.id].reject(new Error(error))
  }
  delete loadTextMap[message.id]
}

function onUpdate(message: type.Extension.MessageUpdate) {
  const { uri, text } = message
  blockMapSource.update({ uri, text })
  vscode.setState({ uri, text })
}

globalThis.addEventListener(
  "message",
  (event: MessageEvent<type.Extension.Message>) => {
    const { data } = event
    switch (data.type) {
      case "update":
        onUpdate(data)
        break
      case "loadImageResponse":
        onLoadImageResponse(data)
        break
      case "loadTextResponse":
        onLoadTextResponse(data)
        break
    }
  },
)

const state = vscode.getState()
if (state) {
  blockMapSource.update(state)
}

register(MainContainer, "main-container")
register(FieldBlockCanvas, "field-block-canvas")
register(CellSwitch, "cell-switch")
register(ModeSwitch, "mode-switch")
register(KeyHandler, "key-handler")
