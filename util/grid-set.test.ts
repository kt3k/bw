import { GridMap, GridSet } from "./grid-set.ts"
import { assert, assertEquals } from "@std/assert"

Deno.test("Grid2Map basic operations", () => {
  const map = new GridMap<string>()
  map.set(1, 2, "a")
  map.set(3, 4, "b")

  assert(map.has(1, 2))
  assertEquals(map.get(1, 2), "a")
  assert(map.has(3, 4))
  assertEquals(map.get(3, 4), "b")
  assert(!map.has(5, 6))
  assertEquals(map.get(5, 6), undefined)
  assert(map.delete(1, 2))
  assert(!map.has(1, 2))
  assertEquals(map.get(1, 2), undefined)
})

Deno.test("Grid2Set basic operations", () => {
  const set = new GridSet<string>()
  set.add(1, 2, "a")
  set.add(1, 2, "b")
  set.add(3, 4, "c")

  assert(set.has(1, 2, "a"))
  assert(set.has(1, 2, "b"))
  assert(set.has(3, 4, "c"))
  assert(!set.has(1, 2, "c"))
  assert(!set.has(5, 6, "d"))
  assertEquals(set.get(1, 2), new Set(["a", "b"]))

  assert(set.delete(1, 2, "a"))
  assert(!set.has(1, 2, "a"))
  assert(set.has(1, 2, "b"))

  assertEquals(set.get(1, 2), new Set(["b"]))
  assertEquals(set.getOne(1, 2), "b")
})
