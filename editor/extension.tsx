// Copyright 2024-2025 Yoshiya Hinosawa. MIT license.

/** @jsxImportSource @kt3k/picojsx */
/** @jsxRuntime automatic */

import * as vscode from "vscode"
import { encodeBase64 } from "@std/encoding/base64"
import type * as type from "./types.ts"

const { workspace, window, Uri } = vscode

export function activate(context: vscode.ExtensionContext) {
  const provider: vscode.CustomTextEditorProvider = {
    resolveCustomTextEditor: (doc, panel) =>
      editor(context.extensionUri, doc, panel),
  }
  const sub = window.registerCustomEditorProvider("kt3k.bwBlock", provider)
  context.subscriptions.push(sub)
}

function editor(
  uri: vscode.Uri,
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
      <body class="key-handler">
        <div class="spacer h-10"></div>
        <div class="main-container relative mt-5 w-[3230px]"></div>
        <div class="cell-switch fixed left-0 top-0 px-1 bg-neutral-900 shadow shadow-neutral-600">
        </div>
        <script src={u("out/webview.js")} type="module"></script>
      </body>
    </html>
  )

  const sub = workspace.onDidChangeTextDocument(onDocChange)
  panel.onDidDispose(() => sub.dispose())
  webview.onDidReceiveMessage(onMessage)
  updateWebview()

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
    if (e.type === "loadImage") loadImage(e)
    else if (e.type === "update") update(e)
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
    const data = await workspace.fs.readFile(Uri.parse(uri))
    const text = "data:image/png;base64," + encodeBase64(data)
    postMessage({ type: "loadImageResponse", text, id })
  }
}
