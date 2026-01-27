import type { Dir, IEntity, IField, MoveAction } from "./types.ts"
import { splashColor } from "../game/field.ts"
import { linePattern0 } from "./effect.ts"

type CommonAction = {
  type: "wait"
  until: number
} | {
  type: "splash"
  hue: number
  sat: number
  light: number
  alpha: number
  radius: number
} | {
  type: "line-pattern-0"
  dirs: readonly Dir[]
  baseSpeed: number
  p0: number
  dist: number
  color: string
  offsetI?: number
  offsetJ?: number
}

export type Motion = {
  step(): void
  finished: boolean
}

export type PropAction =
  | CommonAction
  | { type: "break"; dir: Dir; cb?: (motion: Motion) => void }
  | { type: "remove" }

export type ActorAction =
  | CommonAction
  | MoveAction
  | { readonly type: "go-random" }
  | { readonly type: "speed"; readonly change: "2x" | "4x" | "reset" }
  | {
    readonly type: "turn"
    readonly dir:
      | "north"
      | "south"
      | "west"
      | "east"
      | "left"
      | "right"
      | "back"
  }

export class ActionQueue<
  T extends IEntity,
  A extends Record<string, unknown>,
> {
  #queue: A[] = []
  #handler: (
    field: IField,
    action: Exclude<A, CommonAction>,
  ) => "next" | "end"

  constructor(
    handler: (
      field: IField,
      action: Exclude<A, CommonAction>,
    ) => "next" | "end",
  ) {
    this.#handler = handler
  }

  isEmpty(): boolean {
    return this.#queue.length === 0
  }

  enqueue(...actions: A[]): void {
    this.#queue.push(...actions)
  }

  unshift(...actions: A[]): void {
    this.#queue.unshift(...actions)
  }

  clear(): void {
    this.#queue = []
  }

  process(entity: T, field: IField): "idle" | undefined {
    while (true) {
      const action = this.#queue[0] as unknown as CommonAction
      if (!action) {
        return "idle"
      }

      if (action.type === "wait") {
        if (field.time < action.until) {
          return
        }
        this.#queue.shift()
        continue
      }

      this.#queue.shift()

      switch (action.type) {
        case "splash": {
          const { i, j } = entity
          splashColor(
            field,
            i,
            j,
            action.hue,
            action.sat,
            action.light,
            action.alpha,
            action.radius,
            () => 1,
          )
          break
        }
        case "line-pattern-0": {
          console.log("offset", action.offsetI, action.offsetJ)
          for (
            const effect of linePattern0(
              action.dirs,
              entity.i + (action.offsetI ?? 0),
              entity.j + (action.offsetJ ?? 0),
              action.baseSpeed,
              action.p0,
              action.dist,
              action.color,
            )
          ) {
            field.effects.add(effect)
          }
          break
        }
        default: {
          const result = this.#handler(field, action)
          if (result === "end") {
            return
          }
        }
      }
    }
  }
}
