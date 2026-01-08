import { DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import { Input, inputQueue } from "./ui/input.ts"
import {
  Actor,
  type IdleDelegate,
  type MoveEndDelegate,
} from "../model/actor.ts"
import type { IField, Move } from "../model/types.ts"

export class IdleMainActor implements IdleDelegate {
  onIdle(actor: Actor, field: IField): void {
    if (Input.up) {
      actor.tryMove("go", UP, field)
      return
    } else if (Input.down) {
      actor.tryMove("go", DOWN, field)
      return
    } else if (Input.left) {
      actor.tryMove("go", LEFT, field)
      return
    } else if (Input.right) {
      actor.tryMove("go", RIGHT, field)
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
    field.peekItem(actor.i, actor.j)?.onCollect(actor, field)
  }
}
