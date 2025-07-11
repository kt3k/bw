import { MainCharacter, RandomWalkNPC } from "./character.ts"
import { assertEquals } from "@std/assert"

Deno.test("Character", async (t) => {
  await t.step("physicalGridKey", () => {
    const mc = new MainCharacter(100, 100, 1, "main/")
    assertEquals(mc.physicalGridKey, "100.100")

    const npc = new RandomWalkNPC(200, 200, 1, "npc/")
    assertEquals(npc.physicalGridKey, "200.200")
  })
})
