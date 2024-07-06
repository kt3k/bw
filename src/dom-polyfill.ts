import { DOMParser } from "@b-fuze/deno-dom"
// deno-lint-ignore no-explicit-any
const global = globalThis as any
global.document = new DOMParser().parseFromString("<body></body>", "text/html")
global.__DEV__ = false
