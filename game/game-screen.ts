import type { Context } from "@kt3k/cell"
import { Gameloop } from "@kt3k/gameloop"
import * as signal from "../util/signal.ts"
import { CELL_SIZE } from "../util/constants.ts"
import { IdleMainActor, MoveEndMainActor } from "./main-character.ts"
import { DrawLayer } from "./draw-layer.ts"
import { RectScope } from "../util/rect-scope.ts"

import { Field } from "./field.ts"
import { Actor } from "../model/actor.ts"

const parseStart = (hash: string) => {
  const m = hash.match(/#(-?\d+),(-?\d+)/)
  if (m) {
    return { i: +m[1], j: +m[2] }
  }
  return null
}

const start = parseStart(globalThis.location.hash)

// The starting position of the main character
const I = start?.i ?? -131
const J = start?.j ?? 183

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

class DeactivateScope extends RectScope {
  static MARGIN = 22 * CELL_SIZE
  constructor(screenSize: number) {
    super(
      screenSize + DeactivateScope.MARGIN,
      screenSize + DeactivateScope.MARGIN,
    )
  }
}

const kimiDef = {
  type: "main",
  main: "main",
  src: "../actor/kimi/",
  href: "./actor/kimi/",
}

export function GameScreen({ el, query }: Context) {
  const entityCanvas = query<HTMLCanvasElement>(".canvas-entity")!

  const screenSize = Math.min(globalThis.screen.width, 450)

  entityCanvas.width = screenSize
  entityCanvas.height = screenSize
  el.style.width = screenSize + "px"
  el.style.height = screenSize + "px"

  const me = new Actor(
    I,
    J,
    kimiDef,
    "main",
    "down",
    1,
    new MoveEndMainActor(),
    new IdleMainActor(),
  )
  signal.centerPixel.update({ x: me.centerX, y: me.centerY })

  const viewScope = new ViewScope(screenSize, screenSize)

  const entityLayer = new DrawLayer(entityCanvas, viewScope)

  const activateScope = new ActivateScope(screenSize)
  const deactivateScope = new DeactivateScope(screenSize)

  const field = new Field(query(".field")!, activateScope, deactivateScope)
  field.actors.add(me)

  signal.centerGrid10.subscribe(() => {
    field.checkBlockLoad(me.i, me.j, viewScope)
    field.checkBlockUnload(me.i, me.j)
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

    entityLayer.clear()
    entityLayer.drawIterableEntity(field.props.iter())
    entityLayer.drawIterableEntity(field.items.iter())
    entityLayer.drawIterableEntity(field.actors.iter())
    entityLayer.drawIterableColorBox(field.effects.iter())
    entityLayer.drawWhiteNoise()

    if (i % 300 === 299) {
      field.actors.checkDeactivate(me.i, me.j)
    }
    if (i % 300 === 199) {
      field.items.checkDeactivate(me.i, me.j)
    }
    if (i % 300 === 99) {
      field.props.checkDeactivate(me.i, me.j)
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
