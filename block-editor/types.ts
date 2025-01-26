export type ExtensionMessageUpdate = {
  type: "update"
  uri: string
  text: string
}
export type ExtensionMessageLoadImageResponse = {
  type: "loadImageResponse"
  id: string
  text: string
}
export type ExtensionMessage =
  | ExtensionMessageUpdate
  | ExtensionMessageLoadImageResponse

export type WebviewMessageLoadImage = {
  type: "loadImage"
  id: string
  uri: string
}
export type WebviewMessageUpdate = {
  type: "update"
  map: any
}
export type WebviewMessage = WebviewMessageLoadImage | WebviewMessageUpdate
