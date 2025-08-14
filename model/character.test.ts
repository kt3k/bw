import { RandomlyTurnNPC, StaticNPC } from "./character.ts"
import { assertEquals } from "@std/assert"

Deno.test("Character", async (t) => {
  await t.step("physicalGridKey", () => {
    const mc = new StaticNPC(100, 100, "main/", "main")
    assertEquals(mc.physicalGridKey, "100.100")

    const npc = new RandomlyTurnNPC(200, 200, "npc/", "npc")
    assertEquals(npc.physicalGridKey, "200.200")
  })

  await t.step("frontGrid", () => {
    const c = new StaticNPC(100, 100, "main/", "main")
    assertEquals(c.frontGrid(), [100, 101])

    c.setDir("right")
    assertEquals(c.frontGrid(), [101, 100])
    c.setDir("left")
    assertEquals(c.frontGrid(), [99, 100])
    c.setDir("up")
    assertEquals(c.frontGrid(), [100, 99])
  })
})
