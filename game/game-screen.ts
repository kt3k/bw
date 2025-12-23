import type { Context } from "@kt3k/cell"
import { Gameloop } from "@kt3k/gameloop"
import * as signal from "../util/signal.ts"
import { CELL_SIZE } from "../util/constants.ts"
import { MainCharacter } from "./main-character.ts"
import { DrawLayer } from "./draw-layer.ts"
import { RectScope } from "../util/rect-scope.ts"

import { Field } from "./field.ts"

/** The starting X coordinate */
const I = 50
/** The starting Y coordinate */
const J = 45

/**
 * The area which is visible to the user
 * The center of this area is the center of the screen
 * The center of this area usually follows the 'me' character
 */
class ViewScope extends RectScope {}

/**
 * When the chunk of {@linkcode FieldBlock} overlaps with this scope,
 * the {@linkcode Character}s in that chunk start walking.
 */
class ActivateScope extends RectScope {
  static MARGIN = 20 * CELL_SIZE
  constructor(screenSize: number) {
    super(screenSize + ActivateScope.MARGIN, screenSize + ActivateScope.MARGIN)
  }
}

export function GameScreen({ el, query }: Context) {
  const charCanvas = query<HTMLCanvasElement>(".canvas-chars")!
  const itemCanvas = query<HTMLCanvasElement>(".canvas-items")!
  const objectCanvas = query<HTMLCanvasElement>(".canvas-objects")!

  const screenSize = Math.min(globalThis.screen.width, 450)

  charCanvas.width = screenSize
  charCanvas.height = screenSize
  itemCanvas.width = screenSize
  itemCanvas.height = screenSize
  objectCanvas.width = screenSize
  objectCanvas.height = screenSize
  el.style.width = screenSize + "px"
  el.style.height = screenSize + "px"

  const me = new MainCharacter(I, J, "char/kimi/", "kimi", "down", 1)
  signal.centerPixel.update({ x: me.centerX, y: me.centerY })

  const viewScope = new ViewScope(screenSize, screenSize)

  const objectLayer = new DrawLayer(objectCanvas, viewScope)
  const itemLayer = new DrawLayer(itemCanvas, viewScope)
  const charLayer = new DrawLayer(charCanvas, viewScope, { enableNoise: true })

  const activateScope = new ActivateScope(screenSize)

  const field = new Field(query(".field")!, activateScope)
  field.actors.add(me)

  signal.centerGrid10.subscribe(({ i, j }) => {
    field.checkBlockLoad(i, j, viewScope)
    field.checkBlockUnload(i, j)
  })

  signal.centerPixel.subscribe(({ x, y }) => {
    viewScope.setCenter(x, y)
    field.translateBackground(-viewScope.left, -viewScope.top)
  })

  signal.isGameLoading.subscribe((v) => {
    if (!v) {
      query(".curtain")!.style.opacity = "0"
    }
  })

  let i = 0

  const loop = new Gameloop(60, () => {
    i++
    if (!field.assetsReady) {
      signal.isGameLoading.update(true)
      return
    }
    signal.isGameLoading.update(false)

    field.step()
    signal.centerPixel.update({ x: me.centerX, y: me.centerY })

    itemLayer.drawIterable(field.items.iter())
    charLayer.drawIterable(field.actors.iter())
    objectLayer.drawIterable(field.objects.iter())

    if (i % 300 === 299) {
      field.actors.checkDeactivate(me.i, me.j)
    }
    if (i % 300 === 199) {
      field.items.checkDeactivate(me.i, me.j)
    }
    if (i % 300 === 99) {
      field.objects.checkDeactivate(me.i, me.j)
    }
    if (i % 60 === 59) {
      field.checkActivate(me.i, me.j, { viewScope })
    }
  })
  loop.onStep((fps, v) => {
    signal.fps.update(fps)
    if (v > 3000) {
      signal.v.update(3000)
    }
  })
  loop.start()
}
