// Copyright 2024-2025 Yoshiya Hinosawa. MIT license.

/** @jsxImportSource @kt3k/stringx */
/** @jsxRuntime automatic */

// @ts-types="@types/vscode"
import * as vscode from "vscode"
import { encodeBase64 } from "@std/encoding/base64"
import type * as type from "./types.ts"

const { workspace, window, Uri } = vscode
let uri: vscode.Uri
const viewType = "kt3k.bwBlock"

export function activate(ctx: vscode.ExtensionContext) {
  uri = ctx.extensionUri
  ctx.subscriptions.push(
    window.registerCustomEditorProvider(viewType, { resolveCustomTextEditor }),
  )
}

const CELL_SIZE = 16

function resolveCustomTextEditor(
  document: vscode.TextDocument,
  panel: vscode.WebviewPanel,
) {
  const webview = panel.webview
  webview.options = { enableScripts: true }
  const { i, j } = getGridFromUri(document.uri.path)
  const u = (path: string) => webview.asWebviewUri(Uri.joinPath(uri, path))
  const MAIN_CANVAS_SIZE = CELL_SIZE * 200 // 200 cells wide
  const SIDE_CANVAS_SIZE = 5 * CELL_SIZE // 5 cells on each side
  const INFO_PANEL_WIDTH = 48 // info-panel has w-48
  const CONTAINER_WIDTH = MAIN_CANVAS_SIZE +
    SIDE_CANVAS_SIZE * 2 +
    INFO_PANEL_WIDTH * 4
  webview.html = (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href={u("out/style.css")} rel="stylesheet" />
        <style>
          {`
          .crisp-edges {
            image-rendering: pixelated;
            image-rendering: crisp-edges;
          }
        `}
        </style>
      </head>
      <body class="key-handler p-0">
        <div
          class="canvas-container relative mt-20"
          style={`width: ${CONTAINER_WIDTH}px`}
        >
          <div
            class="canvas-layers absolute"
            style={`width: ${MAIN_CANVAS_SIZE}px; top: ${SIDE_CANVAS_SIZE}px; left: ${SIDE_CANVAS_SIZE}px`}
          >
            <canvas
              class="field-cells-canvas absolute crisp-edges"
              width={MAIN_CANVAS_SIZE}
              height={MAIN_CANVAS_SIZE}
            >
            </canvas>
            <canvas
              class="field-props-canvas absolute crisp-edges"
              width={MAIN_CANVAS_SIZE}
              height={MAIN_CANVAS_SIZE}
            >
            </canvas>
            <canvas
              class="field-items-canvas absolute crisp-edges"
              width={MAIN_CANVAS_SIZE}
              height={MAIN_CANVAS_SIZE}
            >
            </canvas>
            <canvas
              class="field-actors-canvas absolute crisp-edges"
              width={MAIN_CANVAS_SIZE}
              height={MAIN_CANVAS_SIZE}
            >
            </canvas>
          </div>
          <a
            class="next-field absolute hover:opacity-75 opacity-50"
            style={`left: ${SIDE_CANVAS_SIZE}px; top: 0px;`}
            data-i={i}
            data-j={j - 200}
            data-range={`0,195,200,5`}
          >
          </a>
          <a
            class="next-field absolute hover:opacity-75 opacity-50"
            style={`left: ${SIDE_CANVAS_SIZE}px; top: ${
              SIDE_CANVAS_SIZE + MAIN_CANVAS_SIZE
            }px;`}
            data-i={i}
            data-j={j + 200}
            data-range={`0,0,200,5`}
          >
          </a>
          <a
            class="next-field absolute hover:opacity-75 opacity-50"
            style={`left: ${
              SIDE_CANVAS_SIZE + MAIN_CANVAS_SIZE
            }px; top: ${SIDE_CANVAS_SIZE}px;`}
            data-i={i + 200}
            data-j={j}
            data-range={`0,0,5,200`}
          >
          </a>
          <a
            class="next-field absolute hover:opacity-75 opacity-50"
            style={`left: 0px; top: ${SIDE_CANVAS_SIZE}px;`}
            data-i={i - 200}
            data-j={j}
            data-range={`195,0,5,200`}
          >
          </a>
        </div>
        <div class="layer-tool px-2 fixed left-0 top-0 flex flex-wrap items-center bg-neutral-900/50 w-16">
          <div>ACTORS</div>
          <div>ITEMS</div>
          <div>PROPS</div>
          <div>FIELD</div>
        </div>
        <div class="toolbox px-2 fixed left-16 top-0 flex flex-wrap items-center bg-neutral-900/50 w-[calc(100%-16em)]">
          <div class="ml-2 group relative">
            <span class="mode-indicator">dot</span>
            <span class="
              absolute top-full left-1/2 -translate-x-1/2 mt-2
              hidden group-hover:block
            bg-neutral-800 text-white text-sm px-2 py-1 rounded-lg
              border border-neutral-600
              whitespace-nowrap pointer-events-none
            ">
              Press "s" to toggle
            </span>
          </div>
        </div>
        <div class="js-info-panel fixed right-0 top-0 h-full w-48 bg-neutral-900/90 pointer-events-none">
          <div class="info-content text-xs font-mono">
            <div class="py-1 px-2 bg-white/50 text-black">Grid</div>
            <div class="px-2 py-1">
              (i, j): <span class="grid-index text-blue-500"></span>
            </div>
            <div class="py-1 px-2 bg-white/50 text-black">Cell</div>
            <div class="px-2 py-1">
              name: <span class="cell-name text-blue-500"></span>
              <br />
              src: <span class="cell-src text-blue-500"></span>
              <br />
              canEnter: <span class="cell-can-enter text-blue-500"></span>
            </div>
            <div class="py-1 px-2 bg-white/50 text-black">Object</div>
            <div class="px-2 py-1">
              type: <span class="object-type text-blue-500"></span>
              <br />
              src: <span class="object-src text-blue-500"></span>
            </div>
          </div>
        </div>
        <script src={u("out/editor.js")} type="module"></script>
      </body>
    </html>
  )

  const sub = workspace.onDidChangeTextDocument(onDocChange)
  panel.onDidDispose(() => sub.dispose())
  webview.onDidReceiveMessage(onMessage)

  const postMessage = (message: type.Extension.Message) =>
    webview.postMessage(message)

  function onDocChange(e: vscode.TextDocumentChangeEvent) {
    if (e.document.uri.toString() !== document.uri.toString()) return
    postMessage({
      type: "update",
      text: document.getText(),
      uri: document.uri.toString(),
    })
  }

  function onMessage(e: type.Webview.Message) {
    const typ = e.type
    switch (typ) {
      case "ready":
        postMessage({
          type: "init",
          text: document.getText(),
          uri: document.uri.toString(),
        })
        break
      case "update":
        update(e)
        break
      case "loadImage":
        loadImage(e)
        break
      case "loadText":
        loadText(e)
        break
      default:
        typ satisfies never
    }
  }

  function update(e: type.Webview.MessageUpdate) {
    const edit = new vscode.WorkspaceEdit()
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      JSON.stringify(e.map, null, 2),
    )
    workspace.applyEdit(edit)
  }

  async function loadImage({ uri, id }: type.Webview.MessageLoadImage) {
    postMessage({
      type: "loadImageResponse",
      text: "data:image/png;base64," +
        encodeBase64(await workspace.fs.readFile(Uri.parse(uri))),
      id,
    })
  }

  async function loadText({ uri, id }: type.Webview.MessageLoadText) {
    try {
      const text = (await workspace.fs.readFile(Uri.parse(uri))).toString()
      postMessage({
        type: "loadTextResponse",
        text,
        id,
      })
    } catch (error) {
      postMessage({
        type: "loadTextResponse",
        error: (error as Error).message,
        id,
      })
    }
  }
}

function getGridFromUri(uri: string) {
  const m = uri.match(/block_(-?\d+)\.(-?\d+)\.json$/)
  if (!m) return { i: NaN, j: NaN }
  return { i: parseInt(m[1]), j: parseInt(m[2]) }
}
