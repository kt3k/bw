import { MainCharacter, RandomWalkNPC } from "./character.ts"
import { assertEquals } from "@std/assert"

Deno.test("Character", async (t) => {
  await t.step("physicalGridKey", () => {
    const mc = new MainCharacter(100, 100, "main/", "main", "down")
    assertEquals(mc.physicalGridKey, "100.100")

    const npc = new RandomWalkNPC(200, 200, "npc/", "npc", "left")
    assertEquals(npc.physicalGridKey, "200.200")
  })
})
