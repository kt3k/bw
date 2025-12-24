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

import { IEntity } from "../model/types.ts"
import { Catalog, loadCatalog } from "../model/catalog.ts"
import { BlockMap, FieldBlock, PropSpawnInfo } from "../model/field-block.ts"
import { Prop } from "../model/prop.ts"
import { floorN, modulo } from "../util/math.ts"
import { memoizedLoading } from "../util/memo.ts"
import { CanvasWrapper as CanvasWrapper_ } from "../util/canvas-wrapper.ts"
import type * as type from "./types.ts"
import { BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"

type ToolBase = { id: string }
type CellTool = ToolBase & { kind: "cell"; name: string; src: string }
type PropTool =
  & ToolBase
  & (
    | { kind: "prop"; type: string; src: string }
    | { kind: "prop-remove" }
  )

globalThis.addEventListener(
  "message",
  (event: MessageEvent<type.Extension.Message>) => {
    const { data } = event
    switch (data.type) {
      case "init":
        initialData.resolve(data)
        break
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

const loadJson = async (uri: string) => {
  const text = await loadText(uri)
  return JSON.parse(text)
}

function onUpdate(message: { uri: string; text: string }) {
  const { uri, text } = message
  blockMapSource.update({ uri, text })
  vscode.setState({ uri, text })
}

class CanvasWrapper extends CanvasWrapper_ {
  drawEntity(box: IEntity) {
    this.drawImage(
      box.image(),
      modulo(box.x, CANVAS_SIZE),
      modulo(box.y, CANVAS_SIZE),
    )
  }

  clearCell(i: number, j: number) {
    this.ctx.clearRect(
      modulo(i * CELL_SIZE, CANVAS_SIZE),
      modulo(j * CELL_SIZE, CANVAS_SIZE),
      CELL_SIZE,
      CELL_SIZE,
    )
  }
}

class ToolManager {
  cellTools: CellTool[] = []
  propTools: PropTool[] = []
  #toolIndex: number = 0

  static fromCatalog(catalog: Catalog): ToolManager {
    const manager = new ToolManager()
    for (const cellDef of catalog.cells.values()) {
      const id = "cell-" + cellDef.name
      manager.addCellTool({
        kind: "cell",
        name: cellDef.name,
        id,
        src: cellDef.href,
      })
    }

    manager.addPropTool({ kind: "prop-remove", id: "prop-remove" })
    for (const objectDef of catalog.props.values()) {
      const id = `object-${objectDef.type}`
      manager.addPropTool({
        kind: "prop",
        type: objectDef.type,
        src: objectDef.href,
        id,
      })
    }
    return manager
  }

  addCellTool(tool: CellTool) {
    this.cellTools.push(tool)
  }

  addPropTool(tool: PropTool) {
    this.propTools.push(tool)
  }

  toProp(tool: PropTool & { kind: "prop" }): Prop {
    const block = fieldBlock.get()
    return new Prop(
      null,
      0,
      0,
      tool.type as any,
      true,
      new URL(tool.src, block.url).href,
    )
  }

  get toolCount() {
    return this.cellTools.length + this.propTools.length
  }

  #get(index: number): CellTool | PropTool {
    if (index < this.cellTools.length) {
      return this.cellTools[index]
    }
    const objIndex = index - this.cellTools.length
    if (objIndex < this.propTools.length) {
      return this.propTools[objIndex]
    }
    throw new RangeError("Tool index out of range: " + index)
  }

  selectNext(): void {
    this.#toolIndex = (this.#toolIndex + 1) % this.toolCount
  }

  selectPrev(): void {
    this.#toolIndex = (this.#toolIndex - 1 + this.toolCount) % this.toolCount
  }

  selectById(id: string) {
    const cellIndex = this.cellTools.findIndex((tool) => tool.id === id)
    if (cellIndex >= 0) {
      this.#toolIndex = cellIndex
      return
    }
    const objectIndex = this.propTools.findIndex((tool) => tool.id === id)
    if (objectIndex >= 0) {
      this.#toolIndex = this.cellTools.length + objectIndex
      return
    }
    throw new Error("The tool of the given id is not found: " + id)
  }

  currentTool(): CellTool | PropTool {
    return this.#get(this.#toolIndex)
  }

  currentPropTool(): PropTool | null {
    const tool = this.currentTool()
    if (tool.kind === "prop" || tool.kind === "prop-remove") {
      return tool
    }
    return null
  }

  currentCellTool(): CellTool | null {
    const tool = this.currentTool()
    if (tool.kind === "cell") {
      return tool
    }
    return null
  }
}

const CANVAS_SIZE = BLOCK_SIZE * CELL_SIZE
const SIDE_CANVAS_SIZE = CELL_SIZE * 5

const mode = new Signal<"dot" | "stroke">("dot")
const gridIndex = new GroupSignal<{ i: number | null; j: number | null }>({
  i: null,
  j: null,
})

const initialData = Promise.withResolvers<{ uri: string; text: string }>()
const state = vscode.getState()
if (state) {
  initialData.resolve(state)
} else {
  vscode.postMessage({ type: "ready" })
}

const { uri, text } = await initialData.promise
const blockMapSource = new GroupSignal({ uri, text })
const mapObj = JSON.parse(text)
const catalog = await loadCatalog(uri, mapObj.catalogs, { loadJson })
const fieldBlock = blockMapSource.map(({ uri, text }) =>
  new FieldBlock(new BlockMap(uri, JSON.parse(text), catalog))
)
await fieldBlock.get().loadAssets({ loadImage })

const toolManager = ToolManager.fromCatalog(catalog)
const currentTool = new Signal<CellTool | PropTool>(toolManager.currentTool())

function updateTools(manager: ToolManager) {
  const tool = manager.currentTool()
  currentTool.update(tool)
}

function updateDocument(b: FieldBlock) {
  fieldBlock.update(b)
  vscode.postMessage({
    type: "update",
    map: b.toMap().toObject(),
  })
}

const SWITCH_ACTIVE = "bg-cyan-400"
const SWITCH_ACTIVE_CANVAS = "opacity-70"

async function Toolbox({ el, on, subscribe }: Context<HTMLElement>) {
  subscribe(currentTool, (tool) => {
    for (const child of Array.from(el.children)) {
      const firstChild = child.firstElementChild
      child.classList.toggle(SWITCH_ACTIVE, child.id === tool.id)
      firstChild?.classList.toggle(SWITCH_ACTIVE_CANVAS, child.id === tool.id)
    }
  })

  on("click", (e) => {
    const div = e.target as HTMLDivElement
    toolManager.selectById(div.id)
    updateTools(toolManager)
  })

  const block = fieldBlock.get()
  toolManager.cellTools.forEach(async (cellTool) => {
    const id = "cell-" + cellTool.name
    const div = ht.div(
      { id, class: "inline-block p-1 m-1 rounded cursor-pointer" },
      <canvas width="16" height="16" class="pointer-events-none"></canvas>,
    )
    el.appendChild(div)
    const canvas = div.querySelector("canvas")!
    const ctx = canvas.getContext("2d")!
    const img = await block.loadCellImage(cellTool.src, { loadImage })
    ctx.drawImage(img, 0, 0, 16, 16)
  })

  for (const propTool of toolManager.propTools) {
    const id = propTool.id
    const attrs = { id, class: "inline-block p-1 m-1 rounded cursor-pointer" }
    if (propTool.kind === "prop-remove") {
      el.appendChild(ht.div(
        attrs,
        <span class="w-4 h-4 block text-xs text-center text-white pointer-events-none">
          φ
        </span>,
      ))
      continue
    }
    const obj = toolManager.toProp(propTool)
    const div = ht.div(
      attrs,
      <canvas width="16" height="16" class="pointer-events-none"></canvas>,
    )
    el.appendChild(div)
    const wrapper = new CanvasWrapper(div.querySelector("canvas")!)
    obj.loadAssets({ loadImage }).then(() => {
      wrapper.drawEntity(obj)
    })
  }

  el.appendChild(el.firstChild!) // move mode indicator to last
}

function ModeIndicator({ subscribe, el }: Context<HTMLElement>) {
  subscribe(mode, (mode) => el.textContent = mode)
}

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

function getGridFromUri(uri: string) {
  const m = uri.match(/block_(-?\d+)\.(-?\d+)\.json$/)
  if (!m) return { i: NaN, j: NaN }
  return { i: parseInt(m[1]), j: parseInt(m[2]) }
}

async function CanvasLayers({ el }: Context) {
  const block = fieldBlock.get()

  const cellsCanvas = block.canvas
  cellsCanvas.style.left = SIDE_CANVAS_SIZE + "px"
  cellsCanvas.style.top = SIDE_CANVAS_SIZE + "px"
  cellsCanvas.style.position = "absolute"
  cellsCanvas.classList.add("field-cells-canvas")
  el.appendChild(cellsCanvas)
  block.renderAll()
  mount("field-cells-canvas", el)

  const objectsCanvas = ht.canvas({
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    style: `left: ${SIDE_CANVAS_SIZE}px; top: ${SIDE_CANVAS_SIZE}px;`,
    class: "absolute field-objects-canvas pointer-events-none",
  })
  el.appendChild(objectsCanvas)
  mount("field-objects-canvas", el)
  const wrapper = new CanvasWrapper(objectsCanvas)
  for (const object of block.propSpawns.getAll()) {
    const obj = Prop.fromSpawn(object)
    await obj.loadAssets({ loadImage })
    wrapper.drawEntity(obj)
  }
  el.appendChild(objectsCanvas)

  const { i, j } = getGridFromUri(block.url)
  const x = [
    [-1, 0],
    [0, -1],
    [0, 1],
    [1, 0],
  ]
  for (const [dx, dy] of x) {
    const k = i + dx * 200
    const l = j + dy * 200
    const href = new URL(`block_${k}.${l}.json`, blockMapSource.get().uri).href
    let text
    try {
      text = await loadText(href)
    } catch {
      text = await loadText(
        new URL("block_not_found.json", blockMapSource.get().uri).href,
      )
    }
    const obj = JSON.parse(text)

    const blockMap = new BlockMap(
      href,
      obj,
      await loadCatalog(href, obj.catalogs, { loadJson }),
    )
    const fieldBlock = new FieldBlock(blockMap)
    await fieldBlock.loadAssets({ loadImage })
    const a = ht.a({
      class: "absolute hover:opacity-75 opacity-50 break-all",
      href: href.replace(/^file:\/\//, "vscode://file"),
    }, `block_${k}.${l}.json`)
    if (dx === -1) {
      const imageData = fieldBlock.createImageDataForRange(
        BLOCK_SIZE - 5,
        0,
        5,
        BLOCK_SIZE,
        fieldBlock.cellMap,
        fieldBlock.imgMap,
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
        fieldBlock.cellMap,
        fieldBlock.imgMap,
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
        fieldBlock.cellMap,
        fieldBlock.imgMap,
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
        fieldBlock.cellMap,
        fieldBlock.imgMap,
      )
      a.appendChild(createCanvasFromImageData(imageData))
      a.style.top = (CANVAS_SIZE + SIDE_CANVAS_SIZE) + "px"
      a.style.left = SIDE_CANVAS_SIZE + "px"
      a.style.width = CANVAS_SIZE + "px"
      a.style.height = SIDE_CANVAS_SIZE + "px"
    }
    el.appendChild(a)
  }
}

function getCoordinatesFromMouseEvent(
  e: MouseEvent,
  el: HTMLElement,
) {
  const block = fieldBlock.get()
  const { left, top } = el.getBoundingClientRect()
  const x = floorN(e.clientX - left, 16)
  const y = floorN(e.clientY - top, 16)
  const i = x / 16 + block.i
  const j = y / 16 + block.j
  return { i, j }
}

function FieldCellsCanvas({ on, el, subscribe }: Context<HTMLCanvasElement>) {
  const canvasWrapper = new CanvasWrapper(el)

  const paint = (e: MouseEvent) => {
    const tool = toolManager.currentCellTool()
    if (tool === null) return
    const block = fieldBlock.get()
    const { i, j } = getCoordinatesFromMouseEvent(e, el)
    const { name } = tool
    const currentCell = block.getCell(i, j)
    if (!currentCell) return
    // The cell kind is already the same as selected cell
    if (currentCell.name === name) return
    const b = block.clone()
    b.updateCell(i, j, name)
    updateDocument(b)
  }

  on("click", paint)
  on("mousemove", (e) => {
    gridIndex.update(getCoordinatesFromMouseEvent(e, el))
    if (mode.get() === "stroke") paint(e)
  })

  let prev = fieldBlock.get()!
  subscribe(fieldBlock, async (block) => {
    await block.loadAssets({ loadImage })
    for (const [i, j] of prev.diffCells(block)) {
      const cell = block.getCell(i, j)
      block.drawCell(canvasWrapper, i, j, cell, block.imgMap[cell.name])
    }
    prev = block
  })

  subscribe(currentTool, () => {
    el.classList.toggle(
      "pointer-events-none",
      toolManager.currentCellTool() === null,
    )
  })
}

function FieldCharactersCanvas(
  { on, el, subscribe }: Context<HTMLCanvasElement>,
) {
  const canvasWrapper = new CanvasWrapper(el)
}

function FieldItemsCanvas({ on, el, subscribe }: Context<HTMLCanvasElement>) {
  const canvasWrapper = new CanvasWrapper(el)
}

function FieldPropCanvas(
  { el, on, subscribe }: Context<HTMLCanvasElement>,
) {
  const canvasWrapper = new CanvasWrapper(el)

  const paint = (e: MouseEvent) => {
    const block = fieldBlock.get()
    const tool = toolManager.currentPropTool()
    if (tool === null) return
    const { i, j } = getCoordinatesFromMouseEvent(e, el)
    if (tool.kind === "prop-remove") {
      if (block.propSpawns.has(i, j)) {
        const b = block.clone()
        b.propSpawns.remove(i, j)
        updateDocument(b)
      }
    } else {
      const spawn = block.propSpawns.get(i, j)
      if (spawn && spawn.type === tool.type && spawn.src === tool.src) {
        // The object spawn is already the same as selected object
        return
      }
      const b = block.clone()
      if (b.propSpawns.has(i, j)) {
        b.propSpawns.remove(i, j)
      }
      b.propSpawns.add(
        new PropSpawnInfo(
          i,
          j,
          tool.type as any,
          true,
          tool.src,
          block.url,
        ),
      )
      updateDocument(b)
    }
  }

  on("click", paint)
  on("mousemove", (e) => {
    gridIndex.update(getCoordinatesFromMouseEvent(e, el))
    if (mode.get() === "stroke") paint(e)
  })

  subscribe(currentTool, () => {
    el.classList.toggle(
      "pointer-events-none",
      toolManager.currentPropTool() === null,
    )
  })

  let prev: FieldBlock = fieldBlock.get()
  subscribe(fieldBlock, async (block) => {
    for (
      const [action, spawn] of prev.propSpawns.diff(block.propSpawns)
    ) {
      const object = Prop.fromSpawn(spawn)
      await object.loadAssets({ loadImage })
      if (action === "add") {
        canvasWrapper.drawEntity(object)
      } else {
        // action === "remove"
        canvasWrapper.clearCell(object.i, object.j)

        // redraw the object below to fix overlapping area
        canvasWrapper.clearCell(object.i, object.j + 1)
        const spawnBelow = block.propSpawns.get(object.i, object.j + 1)
        if (spawnBelow) {
          const objectBelow = Prop.fromSpawn(spawnBelow)
          await objectBelow.loadAssets({ loadImage })
          canvasWrapper.drawEntity(objectBelow)
        }
      }
    }
    prev = block
  })
}

function KeyHandler({ on }: Context) {
  on("keydown", (e) => {
    if (e.key === "k") {
      toolManager.selectNext()
      updateTools(toolManager)
      mode.update("dot")
    } else if (e.key === "j") {
      toolManager.selectPrev()
      updateTools(toolManager)
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
    const block = fieldBlock.get()
    if (!infoContent || !block) return
    const cell = (i !== null && j !== null) ? block.getCell(i, j) : null
    const cellInfo = cell ? block.cellMap[cell.name] : null
    const spawn = (i !== null && j !== null) ? block.propSpawns.get(i, j) : null
    query(".grid-index")!.textContent = i !== null && j !== null
      ? `(${i}, ${j})`
      : "-"
    query(".cell-name")!.textContent = cell ? cell.name : "-"
    query(".cell-src")!.textContent = cellInfo && cellInfo.src
      ? cellInfo.src
      : "-"
    query(".cell-can-enter")!.textContent = cellInfo
      ? String(cellInfo.canEnter)
      : "-"
    query(".object-type")!.textContent = spawn ? spawn.type : "-"
    query(".object-src")!.textContent = spawn ? spawn.src : "-"
  })
}

register(KeyHandler, "key-handler")
register(Toolbox, "toolbox")
register(ModeIndicator, "mode-indicator")
register(FieldCellsCanvas, "field-cells-canvas")
register(FieldPropCanvas, "field-objects-canvas")
register(InfoPanel, "js-info-panel")
register(CanvasLayers, "canvas-layers")
