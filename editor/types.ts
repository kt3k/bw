// Copyright 2024-2025 Yoshiya Hinosawa. MIT license.

// deno-lint-ignore no-namespace
export namespace Extension {
  export type MessageInit = {
    type: "init"
    uri: string
    text: string
  }
  export type MessageUpdate = {
    type: "update"
    uri: string
    text: string
  }
  export type MessageLoadImageResponse = {
    type: "loadImageResponse"
    id: string
    text: string
  }
  export type MessageLoadTextResponse = {
    type: "loadTextResponse"
    id: string
    text: string
  } | {
    type: "loadTextResponse"
    id: string
    error: string
  }
  export type Message =
    | MessageInit
    | MessageUpdate
    | MessageLoadImageResponse
    | MessageLoadTextResponse
}

// deno-lint-ignore no-namespace
export namespace Webview {
  export type MessageReady = {
    type: "ready"
  }
  export type MessageLoadImage = {
    type: "loadImage"
    id: string
    uri: string
  }
  export type MessageLoadText = {
    type: "loadText"
    id: string
    uri: string
  }
  export type MessageUpdate = {
    type: "update"
    // deno-lint-ignore no-explicit-any
    map: any
  }
  export type Message =
    | MessageLoadImage
    | MessageLoadText
    | MessageUpdate
    | MessageReady
}
