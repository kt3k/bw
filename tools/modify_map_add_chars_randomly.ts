import { parseArgs } from "@std/cli/parse-args"
import {
  BlockMap,
  CharacterSpawnInfo,
  FieldBlock,
} from "../model/field-block.ts"

const randomInt = (n: number) => Math.floor(Math.random() * n)

const args = parseArgs(Deno.args)

if (args._.length === 0) {
  console.error(
    "Usage: deno -A tools/modify_map_add_chars_randomly.ts <map_files...>",
  )
  Deno.exit(1)
}

for (const mapFile of args._) {
  await addCharactersRandomly(mapFile.toString())
}

async function addCharactersRandomly(mapFile: string) {
  const mapJson = new URL("../static/map/" + mapFile + ".json", import.meta.url)

  const map = await Deno.readTextFile(mapJson).then(
    JSON.parse,
  )

  const bm = new BlockMap(mapJson.href, map)
  const fb = new FieldBlock(bm, async (url: string) => {
    const res = await fetch(url)
    return res.blob().then((blob) => createImageBitmap(blob))
  })
  let c = 0
  for (const _ of Array(400)) {
    const i = randomInt(200)
    const j = randomInt(200)
    const cell = bm.field[j][i]
    if (cell === "0" || cell === "D") {
      c++
      const isRandom = Math.random() > 0.5
      const si = new CharacterSpawnInfo(
        i + bm.i,
        j + bm.j,
        isRandom ? "random" : "random-walk",
        isRandom ? "../char/joob/" : "../char/not-found/",
      )
      fb.addCharacterSpawnInfo(si)
    }
  }

  console.log(`Added ${c} characters to the map: ${mapFile}`)
  console.log(`${fb.toMap().toObject().characters.length} characters in total`)

  await Deno.writeTextFile(
    mapJson,
    JSON.stringify(fb.toMap().toObject(), null, 2),
  )
}
