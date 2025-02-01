// Copyright 2024-2025 Yoshiya Hinosawa. MIT license.

// deno-lint-ignore no-namespace
export namespace Extension {
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
  export type Message = MessageUpdate | MessageLoadImageResponse
}

// deno-lint-ignore no-namespace
export namespace Webview {
  export type MessageLoadImage = {
    type: "loadImage"
    id: string
    uri: string
  }
  export type MessageUpdate = {
    type: "update"
    map: any
  }
  export type Message = MessageLoadImage | MessageUpdate
}
