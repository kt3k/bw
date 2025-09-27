// Copyright 2024-2025 Yoshiya Hinosawa. MIT license.

/** @jsxImportSource @kt3k/picojsx */
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

function resolveCustomTextEditor(
  document: vscode.TextDocument,
  panel: vscode.WebviewPanel,
) {
  const webview = panel.webview
  webview.options = { enableScripts: true }
  const u = (path: string) => webview.asWebviewUri(Uri.joinPath(uri, path))
  webview.html = (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href={u("out/style.css")} rel="stylesheet" />
      </head>
      <body class="key-handler p-0">
        <div class="main-container relative mt-10 w-[calc(3360px+196px)]"></div>
        <div class="top-toolbox h-10 px-2 fixed left-0 top-0 flex items-center gap-2 bg-neutral-900/50 w-[calc(100%-12rem)]">
          <div class="cell-switch flex items-center relative"></div>
          <div class="h-full w-0 border-l border-neutral-500/50">&nbsp;</div>
          <div class="object-switch flex items-center relative"></div>
          <div class="group relative">
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
        <script src={u("out/webview.js")} type="module"></script>
      </body>
    </html>
  )

  const sub = workspace.onDidChangeTextDocument(onDocChange)
  panel.onDidDispose(() => sub.dispose())
  webview.onDidReceiveMessage(onMessage)

  function postMessage(message: type.Extension.Message) {
    webview.postMessage(message)
  }

  function updateWebview() {
    postMessage({
      type: "update",
      text: document.getText(),
      uri: document.uri.toString(),
    })
  }

  function onDocChange(e: vscode.TextDocumentChangeEvent) {
    if (e.document.uri.toString() !== document.uri.toString()) return
    updateWebview()
  }

  function onMessage(e: type.Webview.Message) {
    switch (e.type) {
      case "ready":
        updateWebview()
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
