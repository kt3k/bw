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

const blockMapSource = new GroupSignal({ uri: "", text: "" })
const fieldBlock = new Signal<FieldBlock | null>(null)
let prevFieldBlock: FieldBlock | null = null
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

function MainContainer({ subscribe, el, query }: Context) {
  subscribe(fieldBlock, async (fieldBlock) => {
    const prev = prevFieldBlock
    prevFieldBlock = fieldBlock
    if (fieldBlock === null) return

    if (prev === null) {
      await fieldBlock.loadAssets()
      const canvas = fieldBlock.canvas
      canvas.style.left = ""
      canvas.style.top = ""
      canvas.style.position = ""
      canvas.classList.add("field-block-canvas")
      el.innerHTML = ""
      el.appendChild(canvas)
      fieldBlock.renderAll()
      mount("field-block-canvas", el)

      const { i, j } = fieldBlock
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
          `vscode://file/Users/kt3k/oss/bw/static/map/block_${k}.${l}.json`
        const a = document.createElement("a")
        a.href = href
        a.textContent = `block_${k}.${l}.json`
        a.style.width = "20px"
        a.style.height = "20px"
        a.classList.add(
          "absolute",
          "hover:bg-neutral-700",
          "bg-neutral-800",
          "break-all",
        )
        const FULL_SIZE = "3200px"
        if (dx === -1) {
          a.style.left = "0"
          a.style.top = "0"
          a.style.height = FULL_SIZE
          a.style.marginLeft = "-20px"
        } else if (dx === 1) {
          a.style.left = FULL_SIZE
          a.style.top = "0"
          a.style.height = FULL_SIZE
        } else if (dy === -1) {
          a.style.top = "0"
          a.style.left = "0"
          a.style.width = FULL_SIZE
          a.style.marginTop = "-20px"
        } else if (dy === 1) {
          a.style.top = FULL_SIZE
          a.style.left = "0"
          a.style.width = FULL_SIZE
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

function FieldBlockCanvas({ on, el }: Context<HTMLCanvasElement>) {
  const canvasWrapper = new CanvasWrapper(el)

  on("click", (e) => {
    const { left, top } = el.getBoundingClientRect()
    const x = floorN(e.clientX - left, 16)
    const y = floorN(e.clientY - top, 16)
    const i = x / 16
    const j = y / 16
    const block = fieldBlock.get()
    if (block === null) return
    const cell = block.cells[selectedCell.get()!]
    const b = fieldBlock.get()!.clone()
    b.update(i, j, cell.name)
    fieldBlock.update(b)
    const map = b.toMap()
    vscode.postMessage({
      type: "update",
      map: map.toObject(),
    })
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
    } else if (e.key === "j") {
      const currentCell = selectedCell.get()
      const block = fieldBlock.get()
      if (currentCell === null) return
      if (block === null) return
      selectedCell.update(modulo(currentCell - 1, block.cells.length))
    }
  })
}

const loadImage = memoizedLoading((uri: string) => {
  const { resolve, promise } = Promise.withResolvers<ImageBitmap>()
  const id = Math.random().toString()
  loadImageMap[id] = { resolve }
  vscode.postMessage({ type: "loadImage", uri, id })
  return promise
})

type ResolveImage = (image: ImageBitmap) => void
const loadImageMap: Record<string, { resolve: ResolveImage }> = {}

function onUpdate(message: type.Extension.MessageUpdate) {
  const { uri, text } = message
  blockMapSource.update({ uri, text })
  vscode.setState({ uri, text })
}

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

globalThis.addEventListener(
  "message",
  (event: MessageEvent<type.Extension.Message>) => {
    const { data } = event
    if (data.type === "update") {
      onUpdate(data)
    } else if (data.type === "loadImageResponse") {
      onLoadImageResponse(data)
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
register(KeyHandler, "key-handler")
