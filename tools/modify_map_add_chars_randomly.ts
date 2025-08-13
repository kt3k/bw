import { parseArgs } from "@std/cli/parse-args"
import { BlockMap, FieldBlock, SpawnInfo } from "../model/field-block.ts"

const randomInt = (n: number) => Math.floor(Math.random() * n)

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

const bm = new BlockMap(mapJson, map)
const fb = new FieldBlock(bm, async (url: string) => {
  const res = await fetch(url)
  return res.blob().then((blob) => createImageBitmap(blob))
})
let c = 0
for (const _ of Array(100)) {
  const i = randomInt(200)
  const j = randomInt(200)
  const cell = bm.field[j][i]
  console.log(`cell ${cell}`)
  if (cell === "0" || cell === "D") {
    c++
    console.log(`Adding character at (${i}, ${j}) in cell ${cell}`)
    const isRandom = Math.random() > 0.5
    const si = new SpawnInfo(
      i + bm.i,
      j + bm.j,
      isRandom ? "random" : "random-walk",
      isRandom ? "char/joob/" : "char/not-found/",
    )
    fb.addSpawnInfo(si)
  }
}

console.log(`Added ${c} characters to the map`)
console.log(`${fb.toMap().toObject().characters.length} characters in total`)

await Deno.writeTextFile(
  mapJson,
  JSON.stringify(fb.toMap().toObject(), null, 2),
)
