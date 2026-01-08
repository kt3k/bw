import { Actor, MoveGo } from "./actor.ts"
import { ActorDefinition } from "./catalog.ts"
import { assert, assertEquals, assertFalse } from "@std/assert"

const actorDef: ActorDefinition = {
  type: "main",
  src: "../main/",
  href: "./main/",
}

Deno.test("Actor", async (t) => {
  await t.step("physicalGridKey", () => {
    const mc = new Actor(100, 100, actorDef, "main")
    assertEquals(mc.physicalGridKey, "100.100")

    const npc = new Actor(200, 200, actorDef, "npc")
    assertEquals(npc.physicalGridKey, "200.200")
  })

  await t.step("frontGrid", () => {
    const c = new Actor(100, 100, actorDef, "main")
    assertEquals(c.frontGrid(), [100, 101])

    c.setDir("right")
    assertEquals(c.frontGrid(), [101, 100])
    c.setDir("left")
    assertEquals(c.frontGrid(), [99, 100])
    c.setDir("up")
    assertEquals(c.frontGrid(), [100, 99])
  })
})

Deno.test("ActorGoMove", () => {
  const move = new MoveGo(1, "up")
  assertFalse(move.halfPassed)
  assertEquals(move.x, 0)
  assertEquals(move.y, 16)
  move.step() // 1
  assertEquals(move.x, 0)
  assertEquals(move.y, 15)
  move.step() // 2
  assertEquals(move.x, 0)
  assertEquals(move.y, 14)
  move.step() // 3
  assertEquals(move.x, 0)
  assertEquals(move.y, 13)
  move.step() // 4
  assertEquals(move.x, 0)
  assertEquals(move.y, 12)
  move.step() // 5
  assertEquals(move.x, 0)
  assertEquals(move.y, 11)
  move.step() // 6
  assertEquals(move.x, 0)
  assertEquals(move.y, 10)
  move.step() // 7
  assertEquals(move.x, 0)
  assertEquals(move.y, 9)
  assertFalse(move.halfPassed)
  move.step() // 8
  assertEquals(move.x, 0)
  assertEquals(move.y, 8)
  assert(move.halfPassed)
  move.step() // 9
  assertEquals(move.x, 0)
  assertEquals(move.y, 7)
  move.step() // 10
  assertEquals(move.x, 0)
  assertEquals(move.y, 6)
  move.step() // 11
  assertEquals(move.x, 0)
  assertEquals(move.y, 5)
  move.step() // 12
  assertEquals(move.x, 0)
  assertEquals(move.y, 4)
  move.step() // 13
  assertEquals(move.x, 0)
  assertEquals(move.y, 3)
  move.step() // 14
  assertEquals(move.x, 0)
  assertEquals(move.y, 2)
  move.step() // 15
  assertEquals(move.x, 0)
  assertEquals(move.y, 1)
  assertFalse(move.finished)
  move.step() // 16
  assertEquals(move.x, 0)
  assertEquals(move.y, 0)
  assert(move.finished)
})
