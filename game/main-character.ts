import { DOWN, LEFT, RIGHT, UP } from "../util/dir.ts"
import { Input, inputQueue } from "./ui/input.ts"
import {
  Actor,
  ActorMove,
  type IdleDelegate,
  type MoveEndDelegate,
} from "../model/actor.ts"
import type { IField, MovePlan } from "../model/types.ts"

export class IdleMainActor implements IdleDelegate {
  onIdle(_actor: Actor, _field: IField): MovePlan | undefined {
    if (Input.up) {
      return { type: "go", dir: UP }
    } else if (Input.down) {
      return { type: "go", dir: DOWN }
    } else if (Input.left) {
      return { type: "go", dir: LEFT }
    } else if (Input.right) {
      return { type: "go", dir: RIGHT }
    }

    const queueHead = inputQueue[0]

    if (
      queueHead === "space" ||
      queueHead === "touchendempty"
    ) {
      inputQueue.shift()
      return { type: "jump" }
    }
  }
}

export class MoveEndMainActor implements MoveEndDelegate {
  onMoveEnd(actor: Actor, field: IField, _move: ActorMove): void {
    field.peekItem(actor.i, actor.j)?.onCollect(actor, field)
  }
}
