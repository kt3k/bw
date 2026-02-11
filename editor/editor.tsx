// Copyright 2024-2025 Yoshiya Hinosawa. MIT license.
/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />
/// <reference types="@types/vscode-webview" />

/** @jsxImportSource @kt3k/stringx */
/** @jsxRuntime automatic */

const vscode = acquireVsCodeApi<{ uri: string; text: string }>()

import { type Context, GroupSignal, register, Signal } from "@kt3k/cell"
import * as ht from "@kt3k/ht"

import { IEntity } from "../model/types.ts"
import {
  ActorDefinition,
  Catalog,
  CellDefinition,
  ItemDefinition,
  loadCatalog,
  PropDefinition,
} from "../model/catalog.ts"
import {
  BlockMap,
  createImageDataForRange,
  drawCell,
  FieldBlock,
  PropSpawnInfo,
} from "../model/field-block.ts"
import { Prop } from "../model/prop.ts"
import { floorN, modulo } from "../util/math.ts"
import { memoizedLoading } from "../util/memo.ts"
import { CanvasWrapper as CanvasWrapper_ } from "../util/canvas-wrapper.ts"
import type * as type from "./types.ts"
import { BLOCK_SIZE, CELL_SIZE } from "../util/constants.ts"
import { Item } from "../model/item.ts"
import { Actor } from "../model/actor.ts"

type ToolBase = { id: string }
type CellTool = ToolBase & { kind: "cell"; name: string; def: CellDefinition }
type PropTool =
  & ToolBase
  & (
    | { kind: "prop"; type: string; def: PropDefinition }
    | { kind: "prop-remove" }
  )
type ActorTool =
  & ToolBase
  & ({
    kind: "actor"
    type: string
    def: ActorDefinition
  } | { kind: "actor-remove" })
type ItemTool =
  & ToolBase
  & ({ kind: "item"; type: string; def: ItemDefinition } | {
    kind: "item-remove"
  })
type Tool = CellTool | PropTool | ActorTool | ItemTool

function onExtensionMessage({ data }: MessageEvent<type.Extension.Message>) {
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
    default:
      data satisfies never
  }
}
addEventListener("message", onExtensionMessage)

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

class LayerManager {
}

class ToolManager {
  cellTools: CellTool[] = []
  propTools: PropTool[] = []
  actorTools: ActorTool[] = []
  itemTools: ItemTool[] = []
  tools: Tool[] = []
  #toolIndex: number = 0

  static fromCatalog(catalog: Catalog): ToolManager {
    const manager = new ToolManager()
    for (const cellDef of Object.values(catalog.cells)) {
      const id = "cell-" + cellDef.name
      manager.addCellTool({
        kind: "cell",
        name: cellDef.name,
        id,
        def: cellDef,
      })
    }

    manager.addPropTool({ kind: "prop-remove", id: "prop-remove" })
    for (const propDef of Object.values(catalog.props)) {
      const id = `prop-${propDef.type}`
      manager.addPropTool({
        kind: "prop",
        type: propDef.type,
        def: propDef,
        id,
      })
    }

    manager.addItemTool({ kind: "item-remove", id: "item-remove" })
    for (const itemDef of Object.values(catalog.items)) {
      const id = `item-${itemDef.type}`
      manager.addItemTool({
        kind: "item",
        type: itemDef.type,
        def: itemDef,
        id,
      })
    }

    manager.addActorTool({ kind: "actor-remove", id: "actor-remove" })
    for (const actorDef of Object.values(catalog.actors)) {
      const id = `actor-${actorDef.type}`
      manager.addActorTool({
        kind: "actor",
        type: actorDef.type,
        def: actorDef,
        id,
      })
    }

    return manager
  }

  addCellTool(tool: CellTool) {
    this.cellTools.push(tool)
    this.tools.push(tool)
  }

  addPropTool(tool: PropTool) {
    this.propTools.push(tool)
    this.tools.push(tool)
  }

  addActorTool(tool: ActorTool) {
    this.actorTools.push(tool)
    this.tools.push(tool)
  }

  addItemTool(tool: ItemTool) {
    this.itemTools.push(tool)
    this.tools.push(tool)
  }

  toProp(tool: PropTool & { kind: "prop" }): Prop {
    return new Prop(
      null,
      0,
      0,
      // deno-lint-ignore no-explicit-any
      tool.type as any,
      tool.def,
      null,
    )
  }

  toItem(tool: ItemTool & { kind: "item" }): Item {
    return new Item(
      null,
      0,
      0,
      // deno-lint-ignore no-explicit-any
      tool.type as any,
      tool.def,
    )
  }

  toActor(tool: ActorTool & { kind: "actor" }) {
    return new Actor(
      0,
      0,
      tool.def,
      tool.id,
    )
  }

  #get(index: number): Tool {
    if (index < this.tools.length) {
      return this.tools[index]
    }
    throw new RangeError("Tool index out of range: " + index)
  }

  selectNext(): void {
    this.#toolIndex = modulo(this.#toolIndex + 1, this.tools.length)
  }

  selectPrev(): void {
    this.#toolIndex = modulo(this.#toolIndex - 1, this.tools.length)
  }

  selectById(id: string) {
    const i = this.tools.findIndex((tool) => tool.id === id)
    if (i < 0) {
      throw new Error("The tool of the given id is not found: " + id)
    }
    this.#toolIndex = i
  }

  currentTool(): Tool {
    return this.#get(this.#toolIndex)
  }

  currentCellTool(): CellTool | null {
    const tool = this.currentTool()
    return tool.kind === "cell" ? tool : null
  }

  currentPropTool(): PropTool | null {
    const tool = this.currentTool()
    return (tool.kind === "prop" || tool.kind === "prop-remove") ? tool : null
  }

  currentActorTool(): ActorTool | null {
    const tool = this.currentTool()
    return (tool.kind === "actor" || tool.kind === "actor-remove") ? tool : null
  }

  currentItemTool(): ItemTool | null {
    const tool = this.currentTool()
    return (tool.kind === "item" || tool.kind === "item-remove") ? tool : null
  }

  withCellTool(cb: (tool: CellTool) => void) {
    const tool = this.currentTool()
    if (tool.kind === "cell") {
      cb(tool)
    }
  }

  withPropTool(cb: (tool: PropTool) => void) {
    const tool = this.currentTool()
    if (tool.kind === "prop" || tool.kind === "prop-remove") {
      cb(tool)
    }
  }

  withActorTool(cb: (tool: ActorTool) => void) {
    const tool = this.currentTool()
    if (tool.kind === "actor" || tool.kind === "actor-remove") {
      cb(tool)
    }
  }

  withItemTool(cb: (tool: ItemTool) => void) {
    const tool = this.currentTool()
    if (tool.kind === "item" || tool.kind === "item-remove") {
      cb(tool)
    }
  }
}

const CANVAS_SIZE = BLOCK_SIZE * CELL_SIZE

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

function editBlock(cb: (block: FieldBlock) => void) {
  const block = fieldBlock.get().clone()
  cb(block)
  updateDocument(block)
}

const toolManager = ToolManager.fromCatalog(catalog)
const currentTool = new Signal<Tool>(toolManager.currentTool())

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

function Toolbox({ el, on, subscribe }: Context<HTMLElement>) {
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
    const img = await block.loadCellImage(cellTool.def.href, { loadImage })
    ctx.drawImage(img, 0, 0, 16, 16)
  })

  for (const propTool of toolManager.propTools) {
    const id = propTool.id
    const attrs = { id, class: "inline-block p-1 m-1 rounded cursor-pointer" }
    if (propTool.kind === "prop-remove") {
      el.appendChild(ht.div(
        attrs,
        <span class="w-4 h-4 block text-xs text-center text-white pointer-events-none">
          φp
        </span>,
      ))
      continue
    }
    const prop = toolManager.toProp(propTool)
    const div = ht.div(
      attrs,
      <canvas width="16" height="16" class="pointer-events-none"></canvas>,
    )
    el.appendChild(div)
    const wrapper = new CanvasWrapper(div.querySelector("canvas")!)
    prop.loadAssets({ loadImage }).then(() => {
      wrapper.drawEntity(prop)
    })
  }

  for (const itemTool of toolManager.itemTools) {
    const id = itemTool.id
    const attrs = { id, class: "inline-block p-1 m-1 rounded cursor-pointer" }
    if (itemTool.kind === "item-remove") {
      el.appendChild(ht.div(
        attrs,
        <span class="w-4 h-4 block text-xs text-center text-white pointer-events-none">
          φi
        </span>,
      ))
      continue
    }
    const item = toolManager.toItem(itemTool)
    const div = ht.div(
      attrs,
      <canvas width="16" height="16" class="pointer-events-none"></canvas>,
    )
    el.appendChild(div)
    const wrapper = new CanvasWrapper(div.querySelector("canvas")!)
    item.loadAssets({ loadImage }).then(() => {
      wrapper.drawEntity(item)
    })
  }

  for (const actorTool of toolManager.actorTools) {
    const id = actorTool.id
    const attrs = { id, class: "inline-block p-1 m-1 rounded cursor-pointer" }
    if (actorTool.kind === "actor-remove") {
      el.appendChild(ht.div(
        attrs,
        <span class="w-4 h-4 block text-xs text-center text-white pointer-events-none">
          φa
        </span>,
      ))
      continue
    }
    const actor = toolManager.toActor(actorTool)
    const div = ht.div(
      attrs,
      <canvas width="16" height="16" class="pointer-events-none"></canvas>,
    )
    el.appendChild(div)
    const wrapper = new CanvasWrapper(div.querySelector("canvas")!)
    actor.loadAssets({ loadImage }).then(() => {
      wrapper.drawEntity(actor)
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
    class: "absolute top-0 left-0 crisp-edges",
  })
  const ctx = canvas.getContext("2d")!
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

async function CanvasLayers({ query, on, el, subscribe }: Context) {
  const cellsCanvas = query<HTMLCanvasElement>(".field-cells-canvas")!
  const cellsCanvasWrapper = new CanvasWrapper(cellsCanvas)
  const propsCanvas = query<HTMLCanvasElement>(".field-props-canvas")!
  const propsCanvasWrapper = new CanvasWrapper(propsCanvas)
  const itemsCanvas = query<HTMLCanvasElement>(".field-items-canvas")!
  const itemsCanvasWrapper = new CanvasWrapper(itemsCanvas)
  const actorsCanvas = query<HTMLCanvasElement>(".field-actors-canvas")!
  const actorsCanvasWrapper = new CanvasWrapper(actorsCanvas)

  const block = fieldBlock.get()
  block.renderAll(cellsCanvas)

  for (const spawn of block.propSpawns.getAll()) {
    const prop = Prop.fromSpawn(spawn)
    prop.loadAssets({ loadImage })
      .then(() => propsCanvasWrapper.drawEntity(prop))
  }

  const paint = (e: MouseEvent) => {
    const block = fieldBlock.get()
    const { i, j } = getCoordinatesFromMouseEvent(e, el)

    toolManager.withCellTool(({ name }) => {
      const cell = block.getCell(i, j)
      if (cell && cell.name !== name) {
        editBlock((b) => b.updateCell(i, j, name))
      }
    })

    toolManager.withPropTool((tool) => {
      if (tool.kind === "prop-remove") {
        if (block.propSpawns.has(i, j)) {
          editBlock((b) => b.propSpawns.remove(i, j))
        }
      } else {
        const spawn = block.propSpawns.get(i, j)
        if (spawn && spawn.type === tool.type) {
          // The object spawn is already the same as selected object
          return
        }
        editBlock((b) => {
          if (b.propSpawns.has(i, j)) {
            b.propSpawns.remove(i, j)
          }
          b.propSpawns.add(
            new PropSpawnInfo(
              i,
              j,
              // deno-lint-ignore no-explicit-any
              tool.type as any,
              tool.def,
            ),
          )
        })
      }
    })
  }

  on("click", paint)
  on("mousemove", (e) => {
    gridIndex.update(getCoordinatesFromMouseEvent(e, el))
    if (mode.get() === "stroke") paint(e)
  })

  let prev: FieldBlock = fieldBlock.get()
  subscribe(fieldBlock, async (block) => {
    const cellsDiff = prev.diffCells(block)
    const propsDiff = prev.propSpawns.diff(block.propSpawns)
    prev = block

    block.loadAssets({ loadImage }).then(() => {
      for (const [i, j] of cellsDiff) {
        const cell = block.getCell(i, j)
        drawCell(cellsCanvasWrapper, i, j, cell, block.imgMap[cell.name])
      }
    })

    for (const [action, spawn] of propsDiff) {
      const prop = Prop.fromSpawn(spawn)
      await prop.loadAssets({ loadImage })
      if (action === "add") {
        propsCanvasWrapper.drawEntity(prop)
      } else {
        // action === "remove"
        propsCanvasWrapper.clearCell(prop.i, prop.j)

        // redraw the object below to fix overlapping area
        propsCanvasWrapper.clearCell(prop.i, prop.j + 1)
        const spawnBelow = block.propSpawns.get(prop.i, prop.j + 1)
        if (spawnBelow) {
          const objectBelow = Prop.fromSpawn(spawnBelow)
          await objectBelow.loadAssets({ loadImage })
          propsCanvasWrapper.drawEntity(objectBelow)
        }
      }
    }
  })
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
    const cellInfo = cell ? block.cells[cell.name] : null
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
    query(".object-src")!.textContent = spawn ? spawn.def.src : "-"
  })
}

async function NextField({ el }: Context<HTMLAnchorElement>) {
  const i = el.dataset.i!
  const j = el.dataset.j!
  const range = el.dataset.range!.split(",").map((s) => parseInt(s)) as [
    number,
    number,
    number,
    number,
  ]
  const href = new URL(`block_${i}.${j}.json`, blockMapSource.get().uri).href
  el.href = href.replace(/^file:\/\//, "vscode://file")
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
  const nextBlock = new FieldBlock(blockMap)
  await nextBlock.loadAssets({ loadImage })
  const imageData = createImageDataForRange(
    range[0],
    range[1],
    range[2],
    range[3],
    nextBlock.cells,
    nextBlock.imgMap,
    nextBlock.field,
  )
  el.appendChild(createCanvasFromImageData(imageData))
}

register(KeyHandler, "key-handler")
register(Toolbox, "toolbox")
register(ModeIndicator, "mode-indicator")
register(InfoPanel, "js-info-panel")
register(CanvasLayers, "canvas-layers")
register(NextField, "next-field")
