import { parseArgs } from "@std/cli/parse-args"
import { BlockMap, FieldBlock, SpawnInfo } from "../model/field-block.ts"
import { randomInt } from "../util/random.ts"

const args = parseArgs(Deno.args)

if (args._.length !== 1) {
  console.error("Usage: modify_map_add_chars_randomly <map_file>")
  Deno.exit(1)
}

const mapFile = args._[0]

const mapJson = "static/map/" + mapFile + ".json"

const map = await Deno.readTextFile(mapJson).then(
  JSON.parse,
)

const bm = new BlockMap("static/map/" + mapFile + ".json", map)
const fb = new FieldBlock(bm, async (url: string) => {
  const res = await fetch(url)
  return res.blob().then((blob) => createImageBitmap(blob))
})
let i = 0
for (const _ of Array(100)) {
  const i = randomInt(200)
  const j = randomInt(200)
  const cell = bm.field[j][i]
  console.log(`cell ${cell}`)
  if (cell === "0" || cell === "D") {
    i++
    console.log(`Adding character at (${i}, ${j}) in cell ${cell}`)
    const si = new SpawnInfo(
      i + bm.i,
      j + bm.j,
      "random",
      Math.random() > 0.5 ? "char/joob/" : "char/not-found/",
    )
    fb.addSpawnInfo(si)
  }
}

console.log(`Added ${i} characters to the map`)

await Deno.writeTextFile(
  mapJson,
  JSON.stringify(fb.toMap().toObject(), null, 2),
)
