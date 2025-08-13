import { parseArgs } from "@std/cli/parse-args"
import { BlockMap, FieldBlock, SpawnInfo } from "../model/field-block.ts"

const args = parseArgs(Deno.args)

if (args._.length !== 1) {
  console.error("Usage: modify_map_clear_chars.ts <map_file>")
  Deno.exit(1)
}

const mapFile = args._[0]

const mapJson = "static/map/" + mapFile + ".json"

const map = await Deno.readTextFile(mapJson).then(
  JSON.parse,
)

const bm = new BlockMap(mapJson, map)
const fb = new FieldBlock(bm, async (url: string) => {
  const res = await fetch(url)
  return res.blob().then((blob) => createImageBitmap(blob))
})

fb.clearSpawnInfo()

console.log(`Cleared all characters from the map ${mapFile}`)
await Deno.writeTextFile(
  mapJson,
  JSON.stringify(fb.toMap().toObject(), null, 2),
)
