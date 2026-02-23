import { DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import { Input, inputQueue } from "./ui/input.ts"
import {
  Actor,
  type IdleDelegate,
  type MoveEndDelegate,
} from "../model/actor.ts"
import { opposite } from "../util/dir.ts"
import type { Dir, IField, Move } from "../model/types.ts"
import { linePattern0 } from "../model/effect.ts"

const mushroomEffect = function (
  actor: Actor,
  dir: Dir,
) {
  return linePattern0(
    [dir],
    actor.i,
    actor.j,
    1,
    0.5,
    2,
    "#AA0000",
  )
}

export class IdleMainActor implements IdleDelegate {
  onIdle(actor: Actor, field: IField): void {
    let dir: Dir | null = null
    if (Input.up) {
      dir = UP
    } else if (Input.down) {
      dir = DOWN
    } else if (Input.left) {
      dir = LEFT
    } else if (Input.right) {
      dir = RIGHT
    }

    if (dir !== null) {
      actor.tryMove("go", dir, field)
      if (actor.buff.mushroom) {
        for (const effect of mushroomEffect(actor, opposite(dir))) {
          field.effects.add(effect)
        }
      }
      return
    }

    const queueHead = inputQueue[0]

    if (
      queueHead === "space" ||
      queueHead === "touchendempty"
    ) {
      inputQueue.shift()
      actor.jump()
    }
  }
}

export class MoveEndMainActor implements MoveEndDelegate {
  onMoveEnd(actor: Actor, field: IField, _move: Move): void {
    //console.log("peekItem", actor.i, actor.j, field.peekItem(actor.i, actor.j))
    ;(field as any).items.debug()
    field.peekItem(actor.i, actor.j)?.onCollect(actor, field)
  }
}
