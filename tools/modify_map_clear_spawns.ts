import { parseArgs } from "@std/cli/parse-args"
import { BlockMap, FieldBlock } from "../model/field-block.ts"

const args = parseArgs(Deno.args)

if (args._.length === 0) {
  console.error("Usage: modify_map_clear_spawns.ts <map_file>")
  Deno.exit(1)
}

for (const mapFile of args._) {
  await clear(mapFile.toString())
}

async function clear(mapFile: string) {
  const mapJson = new URL("../static/map/" + mapFile + ".json", import.meta.url)

  const map = await Deno.readTextFile(mapJson).then(
    JSON.parse,
  )

  const bm = new BlockMap(mapJson.href, map)
  const fb = new FieldBlock(bm)

  fb.actorSpawns.clear()
  fb.itemSpawns.clear()

  console.log(`Cleared all characters and items from the map ${mapFile}`)
  await Deno.writeTextFile(
    mapJson,
    JSON.stringify(fb.toMap().toObject(), null, 2),
  )
}
