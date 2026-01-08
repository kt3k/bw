import type { Dir, IEntity, IField, MovePlan } from "./types.ts"
import { splashColor } from "../game/field.ts"

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
}

export type PropAction =
  | CommonAction
  | { type: "break"; dir: Dir }
  | { type: "remove" }

export type ActorAction =
  | CommonAction
  | MovePlan
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
  R = undefined,
> {
  #queue: A[] = []
  #handler: (
    field: IField,
    action: Exclude<A, CommonAction>,
  ) => R | undefined

  constructor(
    handler: (
      field: IField,
      action: Exclude<A, CommonAction>,
    ) => R | undefined,
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

  process(entity: T, field: IField): R | "idle" | "wait" {
    while (true) {
      const action = this.#queue[0] as unknown as CommonAction
      if (!action) {
        return "idle"
      }

      if (action.type === "wait") {
        if (field.time < action.until) {
          return "wait"
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
        default: {
          const result = this.#handler(field, action)
          if (result) {
            return result
          }
        }
      }
    }
  }
}
