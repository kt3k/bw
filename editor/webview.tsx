// Copyright 2024-2025 Yoshiya Hinosawa. MIT license.
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />
/// <reference types="@types/vscode-webview" />

/** @jsxImportSource @kt3k/stringx */
/** @jsxRuntime automatic */

const vscode = acquireVsCodeApi<{ uri: string; text: string }>()

import { type Context, GroupSignal, mount, register, Signal } from "@kt3k/cell"
import * as ht from "@kt3k/ht"

import { BlockMap, FieldBlock, ObjectSpawnInfo } from "../model/field-block.ts"
import { Object } from "../model/object.ts"
import { floorN, modulo } from "../util/math.ts"
import { memoizedLoading } from "../util/memo.ts"
import { CanvasWrapper } from "../util/canvas-wrapper.ts"
import type * as type from "./types.ts"
import { BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"

type ToolBase = { id: string }
type CellTool = ToolBase & { kind: "cell"; name: string }
type ObjectTool =
  & ToolBase
  & (
    | { kind: "object"; type: string; src: string }
    | { kind: "object-remove" }
  )

const CANVAS_SIZE = BLOCK_SIZE * CELL_SIZE
const SIDE_CANVAS_SIZE = CELL_SIZE * 5
const blockMapSource = new GroupSignal({ uri: "", text: "" })
const fieldBlock = new Signal<FieldBlock | null>(null)
const mode = new Signal<"dot" | "stroke">("dot")
const gridIndex = new GroupSignal<{ i: number | null; j: number | null }>({
  i: null,
  j: null,
})

class Toolbox {
  cells: CellTool[] = []
  objects: ObjectTool[] = []
  #toolIndex: number = 0

  addCellTool(tool: CellTool) {
    this.cells.push(tool)
  }

  addObjectTool(tool: ObjectTool) {
    this.objects.push(tool)
  }

  get length() {
    return this.cells.length + this.objects.length
  }

  #get(index: number): CellTool | ObjectTool {
    if (index < this.cells.length) {
      return this.cells[index]
    }
    const objIndex = index - this.cells.length
    if (objIndex < this.objects.length) {
      return this.objects[objIndex]
    }
    throw new RangeError("Tool index out of range: " + index)
  }

  selectNext(): void {
    this.#toolIndex = (this.#toolIndex + 1) % this.length
  }

  selectPrev(): void {
    this.#toolIndex = (this.#toolIndex - 1 + this.length) % this.length
  }

  selectById(id: string) {
    const cellIndex = this.cells.findIndex((tool) => tool.id === id)
    if (cellIndex >= 0) {
      this.#toolIndex = cellIndex
      return
    }
    const objectIndex = this.objects.findIndex((tool) => tool.id === id)
    if (objectIndex >= 0) {
      this.#toolIndex = this.cells.length + objectIndex
      return
    }
    throw new Error("The tool of the given id is not found: " + id)
  }

  currentTool(): CellTool | ObjectTool {
    return this.#get(this.#toolIndex)
  }
}

const toolbox = new Toolbox()
const currentTool = new Signal<CellTool | ObjectTool | null>(null)

blockMapSource.subscribe(({ uri, text }) => {
  if (uri === "" || text === "") {
    fieldBlock.update(null)
    return
  }
  fieldBlock.update(
    new FieldBlock(new BlockMap(uri, JSON.parse(text))),
  )
})

const SWITCH_ACTIVE = ["bg-cyan-400"]
const SWITCH_ACTIVE_CANVAS = ["opacity-70"]

function ToolControlPanel({ el, on, subscribe }: Context<HTMLElement>) {
  let initialized = false

  subscribe(fieldBlock, async (fieldBlock) => {
    if (fieldBlock === null) return
    if (initialized) return
    initialized = true

    const cells = await Promise.all(fieldBlock.cells.map(async (cell) => {
      const id = "cell-" + cell.name
      toolbox.addCellTool({ kind: "cell", name: cell.name, id })
      let div = el.querySelector('[id="' + id + '"]')
      if (div) return div
      div = ht.div(
        { id, class: "inline-block p-1 m-1 rounded cursor-pointer" },
        <canvas width="16" height="16" class="pointer-events-none"></canvas>,
      )
      const canvas = div.querySelector("canvas")!
      const ctx = canvas.getContext("2d")!
      if (cell.color) {
        canvas.style.backgroundColor = cell.color
      }
      if (cell.src) {
        for (const src of cell.src) {
          const img = await fieldBlock.loadCellImage(src, { loadImage })
          ctx.drawImage(img, 0, 0, 16, 16)
        }
      }
      return div
    }))
    cells.forEach((cell) => {
      el.appendChild(cell)
    })

    const objKinds = new Set<string>()
    for (const object of fieldBlock.objectSpawns.getAll()) {
      objKinds.add(object.type + "|" + object.src)
    }
    if (objKinds.size > 0) {
      const id = "object-remove"
      toolbox.addObjectTool({ kind: "object-remove", id })
      el.appendChild(
        ht.div(
          { id, class: "inline-block p-1 m-1 rounded cursor-pointer" },
          <span class="w-4 h-4 block text-xs text-center text-white pointer-events-none">
            φ
          </span>,
        ),
      )
    }

    for (const spawn of objKinds) {
      const [type, src] = spawn.split("|")
      const id = `object-${type}-${src}`
      toolbox.addObjectTool({ kind: "object", type, src, id })
      const obj = new Object(
        null,
        0,
        0,
        type as any,
        new URL(src, fieldBlock.url).href,
      )
      await obj.loadAssets({ loadImage })
      const div = ht.div(
        { id, class: "inline-block p-1 m-1 rounded cursor-pointer" },
        <canvas width="16" height="16" class="pointer-events-none"></canvas>,
      )
      const canvas = div.querySelector("canvas")!
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(obj.image(), 0, 0, 16, 16)
      el.appendChild(div)
    }

    currentTool.update(toolbox.currentTool())
  })

  subscribe(currentTool, (tool) => {
    if (tool === null) return
    for (const child of Array.from(el.children)) {
      const firstChild = child.firstElementChild
      if (child.id === tool.id) {
        child.classList.add(...SWITCH_ACTIVE)
        firstChild?.classList.add(...SWITCH_ACTIVE_CANVAS)
      } else {
        child.classList.remove(...SWITCH_ACTIVE)
        firstChild?.classList.remove(...SWITCH_ACTIVE_CANVAS)
      }
    }
  })

  on("click", (e) => {
    const div = e.target as HTMLDivElement
    toolbox.selectById(div.id)
    console.log("Updating current tool", toolbox.currentTool())
    currentTool.update(toolbox.currentTool())
  })
}

function ModeIndicator({ subscribe, el }: Context<HTMLElement>) {
  subscribe(mode, (mode) => el.textContent = mode)
}

function MainContainer({ subscribe, el }: Context) {
  function createCanvasFromImageData(imageData: ImageData) {
    const canvas = ht.canvas({
      width: imageData.width,
      height: imageData.height,
      class: "absolute top-0 left-0",
    })
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
      const objectsCanvas = ht.canvas({
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        style: `left: ${SIDE_CANVAS_SIZE}px; top: ${SIDE_CANVAS_SIZE}px;`,
        class: "absolute field-object-canvas pointer-events-none",
      })
      el.appendChild(objectsCanvas)
      mount("field-object-canvas", el)
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
      const a = ht.a({
        class: "absolute hover:bg-neutral-700 bg-neutral-800 break-all",
        href: href.replace(/^file:\/\//, "vscode://file"),
      }, `block_${k}.${l}.json`)
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
    const block = fieldBlock.get()
    if (block === null) return
    const tool = currentTool.get()
    if (tool === null) return
    const kind = tool.kind
    if (kind !== "cell") return
    const { i, j } = getCoordinatesFromMouseEvent(e, el, block)
    const { name } = tool
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
    if (mode.get() === "stroke") {
      paint(e)
      return
    }
    const block = fieldBlock.get()
    if (block === null) return
    const { i, j } = getCoordinatesFromMouseEvent(e, el, block)
    gridIndex.update({ i, j })
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

  subscribe(currentTool, (tool) => {
    if (tool === null) return
    el.classList.toggle("pointer-events-none", tool.kind !== "cell")
  })
}

function getCoordinatesFromMouseEvent(
  e: MouseEvent,
  el: HTMLElement,
  block: FieldBlock,
) {
  const { left, top } = el.getBoundingClientRect()
  const x = floorN(e.clientX - left, 16)
  const y = floorN(e.clientY - top, 16)
  const i = x / 16 + block.i
  const j = y / 16 + block.j
  return { i, j }
}

function FieldCharactersCanvas(
  { on, el, subscribe }: Context<HTMLCanvasElement>,
) {
  const canvasWrapper = new CanvasWrapper(el)
}

function FieldItemsCanvas({ on, el, subscribe }: Context<HTMLCanvasElement>) {
  const canvasWrapper = new CanvasWrapper(el)
}

function FieldObjectCanvas(
  { el, on, subscribe }: Context<HTMLCanvasElement>,
) {
  const canvasWrapper = new CanvasWrapper(el)

  const paint = (e: MouseEvent) => {
    const block = fieldBlock.get()
    if (block === null) return
    const tool = toolbox.currentTool()
    if (tool === null) return
    if (tool.kind !== "object" && tool.kind !== "object-remove") return
    const { i, j } = getCoordinatesFromMouseEvent(e, el, block)
    const b = block.clone()
    if (tool.kind === "object-remove") {
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
    if (mode.get() === "stroke") {
      paint(e)
      return
    }
    const block = fieldBlock.get()
    if (block === null) return
    const { i, j } = getCoordinatesFromMouseEvent(e, el, block)
    gridIndex.update({ i, j })
  })

  subscribe(currentTool, (tool) => {
    if (tool === null) return
    el.classList.toggle(
      "pointer-events-none",
      !(tool.kind === "object" || tool.kind === "object-remove"),
    )
  })

  let prev: FieldBlock = fieldBlock.get()!
  subscribe(fieldBlock, async (block) => {
    if (block === null) return
    for (
      const [action, spawn] of prev.objectSpawns.diff(block.objectSpawns)
    ) {
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
      toolbox.selectNext()
      currentTool.update(toolbox.currentTool())
      mode.update("dot")
    } else if (e.key === "j") {
      toolbox.selectPrev()
      currentTool.update(toolbox.currentTool())
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

function InfoPanel({ subscribe, query }: Context<HTMLElement>) {
  subscribe(gridIndex, ({ i, j }) => {
    const infoContent = query(".info-content")
    const fb = fieldBlock.get()
    if (!infoContent || !fb) return
    const cell = (i !== null && j !== null) ? fb.getCell(i, j) : null
    const cellInfo = cell ? fb.cellMap[cell.name] : null
    const spawn = (i !== null && j !== null) ? fb.objectSpawns.get(i, j) : null
    query(".grid-index")!.textContent = i !== null && j !== null
      ? `(${i}, ${j})`
      : "-"
    query(".cell-name")!.textContent = cell ? cell.name : "-"
    query(".cell-src")!.textContent = cellInfo && cellInfo.src
      ? cellInfo.src.join(", ")
      : "-"
    query(".cell-can-enter")!.textContent = cellInfo
      ? String(cellInfo.canEnter)
      : "-"
    query(".object-type")!.textContent = spawn ? spawn.type : "-"
    query(".object-src")!.textContent = spawn ? spawn.src : "-"
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
function onLoadImageResponse(
  message: type.Extension.MessageLoadImageResponse,
) {
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
register(ToolControlPanel, "tool-control-panel")
register(ModeIndicator, "mode-indicator")
register(MainContainer, "main-container")
register(FieldCellsCanvas, "field-block-canvas")
register(FieldObjectCanvas, "field-object-canvas")
register(InfoPanel, "js-info-panel")
