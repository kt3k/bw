import { KeyMonitor } from "./key-monitor.ts"
import "../dom-polyfill.ts"
import { mount, register } from "@kt3k/cell"
import { assertEquals } from "@std/assert"
import { Input } from "../../util/dir.ts"

register(KeyMonitor, "key-monitor")

Deno.test("KeyMonitor", () => {
  assertEquals(Input, {
    up: false,
    down: false,
    left: false,
    right: false,
  })

  const div = document.createElement("div")
  div.classList.add("key-monitor")
  document.body.appendChild(div)

  mount()

  div.dispatchEvent(createKeyboardEvent("keydown", "ArrowUp"))

  assertEquals(Input, {
    up: true,
    down: false,
    left: false,
    right: false,
  })

  div.dispatchEvent(createKeyboardEvent("keyup", "ArrowUp"))

  assertEquals(Input, {
    up: false,
    down: false,
    left: false,
    right: false,
  })

  div.dispatchEvent(createKeyboardEvent("keydown", "ArrowDown"))

  assertEquals(Input, {
    up: false,
    down: true,
    left: false,
    right: false,
  })

  div.dispatchEvent(createKeyboardEvent("keyup", "ArrowDown"))

  assertEquals(Input, {
    up: false,
    down: false,
    left: false,
    right: false,
  })

  div.dispatchEvent(createKeyboardEvent("keydown", "ArrowLeft"))

  assertEquals(Input, {
    up: false,
    down: false,
    left: true,
    right: false,
  })

  div.dispatchEvent(createKeyboardEvent("keyup", "ArrowLeft"))

  assertEquals(Input, {
    up: false,
    down: false,
    left: false,
    right: false,
  })

  div.dispatchEvent(createKeyboardEvent("keydown", "ArrowRight"))

  assertEquals(Input, {
    up: false,
    down: false,
    left: false,
    right: true,
  })

  div.dispatchEvent(createKeyboardEvent("keyup", "ArrowRight"))

  assertEquals(Input, {
    up: false,
    down: false,
    left: false,
    right: false,
  })
})

function createKeyboardEvent(type: string, key: string): KeyboardEvent {
  // deno-lint-ignore no-explicit-any
  const e = new Event(type) as any
  e.key = key
  return e
}
