import { parseArgs } from "@std/cli/parse-args"
import {
  BlockMap,
  CharacterSpawnInfo,
  FieldBlock,
  ItemSpawnInfo,
} from "../model/field-block.ts"
import type { ItemType } from "../model/character.ts"

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
    const cell = fb.getCell(i, j)
    if (cell.canEnter) {
      c++
      const isRandom = Math.random() > 0.5
      fb.addCharacterSpawnInfo(
        new CharacterSpawnInfo(
          i + bm.i,
          j + bm.j,
          isRandom ? "random" : "random-walk",
          isRandom ? "../char/joob/" : "../char/not-found/",
          mapJson.href,
        ),
      )
    }
  }
  if (mapFile === "block_0.0") {
    fb.addItemSpawnInfo(
      new ItemSpawnInfo(2, 6, "mushroom", "../item/mushroom.png", mapJson.href),
    )
  }

  if (mapFile === "block_-200.0") {
    const items = [
      [-3, 6, "apple", "../item/apple.png"],
      [-4, 6, "green-apple", "../item/green-apple.png"],
      [-5, 6, "apple", "../item/apple.png"],
      [-6, 6, "apple", "../item/apple.png"],

      [-3, 7, "apple", "../item/apple.png"],
      [-4, 7, "apple", "../item/apple.png"],
      [-5, 7, "apple", "../item/apple.png"],
      [-6, 7, "apple", "../item/apple.png"],

      [-3, 8, "apple", "../item/apple.png"],
      [-4, 8, "apple", "../item/apple.png"],
      [-5, 8, "apple", "../item/apple.png"],
      [-6, 8, "apple", "../item/apple.png"],
    ] as const
    for (const [i, j, type, src] of items) {
      fb.addItemSpawnInfo(new ItemSpawnInfo(i, j, type, src, mapJson.href))
    }
  }

  let itemCount = 0
  for (const _ of Array(1000)) {
    const i = randomInt(200)
    const j = randomInt(200)
    const cell = fb.getCell(i, j)
    if (cell.canEnter) {
      itemCount++
      const random = Math.random()
      let type: ItemType = "apple"
      if (random > 0.93) {
        type = "purple-mushroom"
      } else if (random > 0.8) {
        type = "mushroom"
      } else if (random > 0.65) {
        type = "green-apple"
      }
      fb.addItemSpawnInfo(
        new ItemSpawnInfo(
          i + fb.i,
          j + fb.j,
          type,
          "../item/" + type + ".png",
          mapJson.href,
        ),
      )
    }
  }

  console.log(
    `Added ${c} characters and ${itemCount} items to the map: ${mapFile}`,
  )
  const obj = fb.toMap().toObject()
  console.log(
    `${obj.characters.length} characters and ${obj.items.length} items in total`,
  )

  await Deno.writeTextFile(
    mapJson,
    JSON.stringify(fb.toMap().toObject(), null, 2),
  )
}
