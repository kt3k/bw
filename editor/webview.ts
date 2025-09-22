// Copyright 2024-2025 Yoshiya Hinosawa. MIT license.
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />
/// <reference types="@types/vscode-webview" />

const vscode = acquireVsCodeApi<{ uri: string; text: string }>()

import { BlockMap, FieldBlock, ObjectSpawnInfo } from "../model/field-block.ts"
import { Object } from "../model/object.ts"
import { floorN, modulo } from "../util/math.ts"
import { memoizedLoading } from "../util/memo.ts"
import { CanvasWrapper } from "../util/canvas-wrapper.ts"
import { type Context, GroupSignal, mount, register, Signal } from "@kt3k/cell"
import type * as type from "./types.ts"
import { BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"

const CANVAS_SIZE = BLOCK_SIZE * CELL_SIZE
const SIDE_CANVAS_SIZE = CELL_SIZE * 5
const blockMapSource = new GroupSignal({ uri: "", text: "" })
const fieldBlock = new Signal<FieldBlock | null>(null)
const mode = new Signal<"dot" | "stroke">("dot")

type CellTool = { name: string }
type ObjectTool = { type: string; src: string } | "remove"

const selectedTool = new Signal<string | null>(null)
const cellTools = [] as CellTool[]
const objTools = [] as ObjectTool[]

function parseToolIndex(
  tool: string | null,
): ["cell" | "object" | null, number] {
  if (tool === null) return [null, -1]
  if (tool.startsWith("cell-")) return ["cell", +tool.replace("cell-", "")]
  if (tool.startsWith("object-")) {
    return ["object", +tool.replace("object-", "")]
  }
  return [null, -1]
}

function toolIndex(kind: "cell" | "object", index: number): string {
  return kind + "-" + index
}

function nextTool(current: string | null): string {
  if (current === null) return toolIndex("cell", 0)
  const [kind, index] = parseToolIndex(current)
  if (kind === "cell") {
    const nextIndex = index + 1
    if (nextIndex >= cellTools.length) {
      if (objTools.length === 0) return toolIndex("cell", 0)
      return toolIndex("object", 0)
    }
    return toolIndex("cell", nextIndex)
  } else if (kind === "object") {
    const nextIndex = index + 1
    if (nextIndex >= objTools.length) {
      if (cellTools.length === 0) return toolIndex("object", 0)
      return toolIndex("cell", 0)
    }
    return toolIndex("object", nextIndex)
  } else {
    return toolIndex("cell", 0)
  }
}

function prevTool(current: string | null): string {
  if (current === null) return toolIndex("object", objTools.length - 1)
  const [kind, index] = parseToolIndex(current)
  if (kind === "cell") {
    const prevIndex = index - 1
    if (prevIndex < 0) {
      if (objTools.length === 0) return toolIndex("cell", cellTools.length - 1)
      return toolIndex("object", objTools.length - 1)
    }
    return toolIndex("cell", prevIndex)
  } else if (kind === "object") {
    const prevIndex = index - 1
    if (prevIndex < 0) {
      if (cellTools.length === 0) {
        return toolIndex("object", objTools.length - 1)
      }
      return toolIndex("cell", cellTools.length - 1)
    }
    return toolIndex("object", prevIndex)
  } else {
    return toolIndex("object", objTools.length - 1)
  }
}

blockMapSource.subscribe(({ uri, text }) => {
  if (uri === "" || text === "") {
    fieldBlock.update(null)
    return
  }
  fieldBlock.update(
    new FieldBlock(new BlockMap(uri, JSON.parse(text))),
  )
})

const CELL_SWITCH_ACTIVE_CLASSES = ["bg-cyan-400"]
const OBJECT_SWITCH_ACTIVE_CLASSES = ["bg-red-400"]
const SWITCH_ACTIVE_CANVAS_CLASSES = ["opacity-70"]

function CellSwitch({ on, el, subscribe }: Context) {
  let initialized = false
  subscribe(fieldBlock, async (fieldBlock) => {
    if (fieldBlock === null) return
    if (initialized) return
    initialized = true

    const cells = await Promise.all(fieldBlock.cells.map(async (cell) => {
      cellTools.push({ name: cell.name })
      let div = el.querySelector<HTMLDivElement>(
        '[name="' + cell.name + '"]',
      )
      if (div) {
        return div
      }
      div = document.createElement("div")
      div.classList.add(
        "inline-block",
        "p-1",
        "m-1",
        "rounded",
        "cursor-pointer",
      )
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
          const img = await fieldBlock.loadCellImage(src, { loadImage })
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
    if (cells.length > 0 && selectedTool.get() === null) {
      selectedTool.update(toolIndex("cell", 0))
    }
  })
  subscribe(selectedTool, (selected) => {
    const [kind, index] = parseToolIndex(selected)
    const children = Array.from(el.children)
    children.forEach((child, i) => {
      const firstChild = child.firstChild as HTMLElement
      if (kind === "cell" && i === index) {
        child.classList.add(...CELL_SWITCH_ACTIVE_CLASSES)
        firstChild.classList.add(...SWITCH_ACTIVE_CANVAS_CLASSES)
      } else {
        child.classList.remove(...CELL_SWITCH_ACTIVE_CLASSES)
        firstChild.classList.remove(...SWITCH_ACTIVE_CANVAS_CLASSES)
      }
    })
  })
  on("click", (e) => {
    const index = Array.from(el.children).indexOf(e.target as HTMLElement)
    if (index >= 0) {
      selectedTool.update(toolIndex("cell", index))
    }
  })
}

function ModeIndicator({ subscribe, el }: Context<HTMLElement>) {
  subscribe(mode, (mode) => el.textContent = mode)
}

function ObjectSwitch({ subscribe, el, on }: Context) {
  let initialized = false
  subscribe(fieldBlock, async (fieldBlock) => {
    if (fieldBlock === null) return
    if (initialized) return
    initialized = true
    const objKinds = new Set<string>()
    for (const object of fieldBlock.objectSpawns.getAll()) {
      objKinds.add(object.type + "|" + object.src)
    }
    if (objKinds.size === 0) return
    objTools.unshift("remove")
    const div = document.createElement("div")
    div.classList.add("inline-block", "p-1", "m-1", "rounded", "cursor-pointer")
    const span = document.createElement("span")
    span.classList.add(
      "w-4",
      "h-4",
      "block",
      "text-xs",
      "text-center",
      "text-white",
      "pointer-events-none",
    )
    span.textContent = "φ"
    div.appendChild(span)
    el.appendChild(div)

    for (const spawn of objKinds) {
      const [type, src] = spawn.split("|")
      objTools.push({ type, src })
      const obj = new Object(
        null,
        0,
        0,
        type as any,
        new URL(src, fieldBlock.url).href,
      )
      await obj.loadAssets({ loadImage })
      const div = document.createElement("div")
      div.classList.add(
        "inline-block",
        "p-1",
        "m-1",
        "rounded",
        "cursor-pointer",
      )
      const canvas = document.createElement("canvas")
      canvas.width = 16
      canvas.height = 16
      canvas.classList.add("pointer-events-none")
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(obj.image(), 0, 0, 16, 16)
      div.appendChild(canvas)
      el.appendChild(div)
    }
  })
  subscribe(selectedTool, (selected) => {
    const [kind, index] = parseToolIndex(selected)
    const children = Array.from(el.children)
    children.forEach((child, i) => {
      const firstChild = child.firstChild as HTMLElement
      if (kind === "object" && i === index) {
        child.classList.add(...OBJECT_SWITCH_ACTIVE_CLASSES)
        firstChild.classList.add(...SWITCH_ACTIVE_CANVAS_CLASSES)
      } else {
        child.classList.remove(...OBJECT_SWITCH_ACTIVE_CLASSES)
        firstChild.classList.remove(...SWITCH_ACTIVE_CANVAS_CLASSES)
      }
    })
  })
  on("click", (e) => {
    const index = Array.from(el.children).indexOf(e.target as HTMLElement)
    if (index >= 0) {
      selectedTool.update(toolIndex("object", index))
    }
  })
}

function MainContainer({ subscribe, el }: Context) {
  function createCanvasFromImageData(imageData: ImageData) {
    const canvas = document.createElement("canvas")
    canvas.width = imageData.width
    canvas.height = imageData.height
    canvas.classList.add("absolute", "top-0", "left-0")
    const ctx = canvas.getContext("2d")!
    ctx.putImageData(imageData, 0, 0)
    return canvas
  }

  let initialized = false
  subscribe(fieldBlock, async (fieldBlock) => {
    if (fieldBlock === null) return
    if (initialized) return
    initialized = true

    await fieldBlock.loadAssets({ loadImage })
    const canvas = fieldBlock.canvas
    canvas.style.left = SIDE_CANVAS_SIZE + "px"
    canvas.style.top = SIDE_CANVAS_SIZE + "px"
    canvas.style.position = "absolute"
    canvas.classList.add("field-block-canvas")
    el.innerHTML = ""
    el.appendChild(canvas)
    fieldBlock.renderAll()
    mount("field-block-canvas", el)

    {
      const objectsCanvas = document.createElement("canvas")
      objectsCanvas.width = CANVAS_SIZE
      objectsCanvas.height = CANVAS_SIZE
      objectsCanvas.style.left = SIDE_CANVAS_SIZE + "px"
      objectsCanvas.style.top = SIDE_CANVAS_SIZE + "px"
      objectsCanvas.style.position = "absolute"
      objectsCanvas.classList.add(
        "field-object-spawns-canvas",
        "pointer-events-none",
      )
      el.appendChild(objectsCanvas)
      mount("field-object-spawns-canvas", el)

      const wrapper = new CanvasWrapper(objectsCanvas)
      for (const object of fieldBlock.objectSpawns.getAll()) {
        const obj = new Object(
          null,
          object.i,
          object.j,
          object.type,
          new URL(object.src, fieldBlock.url).href,
        )
        await obj.loadAssets({ loadImage })
        wrapper.drawImage(
          obj.image(),
          obj.x - fieldBlock.x,
          obj.y - fieldBlock.y,
        )
      }
      el.appendChild(objectsCanvas)
    }

    const { i, j } = getGridFromUri(fieldBlock.url)
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
      const fieldBlock = new FieldBlock(blockMap)
      await fieldBlock.loadAssets({ loadImage })
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
        a.appendChild(createCanvasFromImageData(imageData))
        a.style.left = "0"
        a.style.top = SIDE_CANVAS_SIZE + "px"
        a.style.height = CANVAS_SIZE + "px"
        a.style.width = SIDE_CANVAS_SIZE + "px"
      } else if (dx === 1) {
        const imageData = fieldBlock.createImageDataForRange(
          0,
          0,
          5,
          BLOCK_SIZE,
        )
        a.appendChild(createCanvasFromImageData(imageData))
        a.style.left = (CANVAS_SIZE + SIDE_CANVAS_SIZE) + "px"
        a.style.top = SIDE_CANVAS_SIZE + "px"
        a.style.height = CANVAS_SIZE + "px"
        a.style.width = SIDE_CANVAS_SIZE + "px"
      } else if (dy === -1) {
        const imageData = fieldBlock.createImageDataForRange(
          0,
          BLOCK_SIZE - 5,
          BLOCK_SIZE,
          5,
        )
        a.appendChild(createCanvasFromImageData(imageData))
        a.style.top = "0"
        a.style.left = SIDE_CANVAS_SIZE + "px"
        a.style.width = CANVAS_SIZE + "px"
        a.style.height = SIDE_CANVAS_SIZE + "px"
      } else if (dy === 1) {
        const imageData = fieldBlock.createImageDataForRange(
          0,
          0,
          BLOCK_SIZE,
          5,
        )
        a.appendChild(createCanvasFromImageData(imageData))
        a.style.top = (CANVAS_SIZE + SIDE_CANVAS_SIZE) + "px"
        a.style.left = SIDE_CANVAS_SIZE + "px"
        a.style.width = CANVAS_SIZE + "px"
        a.style.height = SIDE_CANVAS_SIZE + "px"
      }
      el.appendChild(a)
    }
  })

  function getGridFromUri(uri: string) {
    const m = uri.match(/block_(-?\d+)\.(-?\d+)\.json$/)
    if (!m) return { i: NaN, j: NaN }
    return { i: parseInt(m[1]), j: parseInt(m[2]) }
  }
}

function FieldCellsCanvas({ on, el, subscribe }: Context<HTMLCanvasElement>) {
  const canvasWrapper = new CanvasWrapper(el)

  const paint = (e: MouseEvent) => {
    const { left, top } = el.getBoundingClientRect()
    const x = floorN(e.clientX - left, 16)
    const y = floorN(e.clientY - top, 16)
    const i = x / 16
    const j = y / 16
    const block = fieldBlock.get()
    if (block === null) return
    const [kind, index] = parseToolIndex(selectedTool.get())
    if (kind !== "cell") return
    const { name } = cellTools[index]
    const currentCell = block.getCell(i, j)
    if (!currentCell) return
    // The cell kind is already the same as selected cell
    if (currentCell.name === name) return
    const b = block.clone()
    b.updateCell(i, j, name)
    fieldBlock.update(b)
    vscode.postMessage({
      type: "update",
      map: b.toMap().toObject(),
    })
  }

  on("click", (e) => {
    paint(e)
  })

  on("mousemove", (e) => {
    if (mode.get() === "stroke") paint(e)
  })

  let prev = fieldBlock.get()!
  subscribe(fieldBlock, async (block) => {
    if (block === null) return
    await block.loadAssets({ loadImage })
    for (const [i, j] of prev.diffCells(block)) {
      block.drawCell(canvasWrapper, i, j)
    }
    prev = block
  })

  subscribe(selectedTool, (selected) => {
    const [kind] = parseToolIndex(selected)
    el.classList.toggle("pointer-events-none", kind !== "cell")
  })
}

function FieldObjectSpawnsCanvas(
  { el, on, subscribe }: Context<HTMLCanvasElement>,
) {
  const canvasWrapper = new CanvasWrapper(el)

  const paint = (e: MouseEvent) => {
    const block = fieldBlock.get()
    if (block === null) return
    const [kind, index] = parseToolIndex(selectedTool.get())
    if (kind !== "object") return
    const { left, top } = el.getBoundingClientRect()
    const x = floorN(e.clientX - left, 16)
    const y = floorN(e.clientY - top, 16)
    const i = x / 16 + block.i
    const j = y / 16 + block.j
    const tool = objTools[index]
    const b = block.clone()
    if (tool === "remove") {
      if (block.objectSpawns.has(i, j)) {
        b.objectSpawns.remove(i, j)
        doUpdate(b)
      }
    } else {
      const { type, src } = tool
      if (b.objectSpawns.has(i, j)) {
        b.objectSpawns.remove(i, j)
      }
      const spawn = new ObjectSpawnInfo(
        i,
        j,
        type as any,
        src,
        block.url,
      )
      b.objectSpawns.add(spawn)
      doUpdate(b)
    }

    function doUpdate(b: FieldBlock) {
      fieldBlock.update(b)
      vscode.postMessage({
        type: "update",
        map: b.toMap().toObject(),
      })
    }
  }

  on("click", (e) => {
    paint(e)
  })
  on("mousemove", (e) => {
    if (mode.get() === "stroke") paint(e)
  })

  subscribe(selectedTool, (tool) => {
    const [kind] = parseToolIndex(tool)
    el.classList.toggle("pointer-events-none", kind !== "object")
  })

  let prev: FieldBlock = fieldBlock.get()!
  subscribe(fieldBlock, async (block) => {
    if (block === null) return
    for (const [action, spawn] of prev.objectSpawns.diff(block.objectSpawns)) {
      const object = new Object(
        null,
        spawn.i,
        spawn.j,
        spawn.type,
        new URL(spawn.src, block.url).href,
      )
      await object.loadAssets({ loadImage })
      if (action === "add") {
        canvasWrapper.drawImage(
          object.image(),
          modulo(object.x, CANVAS_SIZE),
          modulo(object.y, CANVAS_SIZE),
        )
      } else {
        canvasWrapper.ctx.clearRect(
          modulo(object.x, CANVAS_SIZE),
          modulo(object.y, CANVAS_SIZE),
          CELL_SIZE,
          CELL_SIZE,
        )
      }
    }
    prev = block
  })
}

function KeyHandler({ on }: Context) {
  on("keydown", (e) => {
    if (e.key === "k") {
      selectedTool.update(nextTool(selectedTool.get()))
      mode.update("dot")
    } else if (e.key === "j") {
      selectedTool.update(prevTool(selectedTool.get()))
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
} else {
  vscode.postMessage({ type: "ready" })
}

register(KeyHandler, "key-handler")
register(CellSwitch, "cell-switch")
register(ObjectSwitch, "object-switch")
register(ModeIndicator, "mode-indicator")
register(MainContainer, "main-container")
register(FieldCellsCanvas, "field-block-canvas")
register(FieldObjectSpawnsCanvas, "field-object-spawns-canvas")
