import { loadJson } from "../util/load.ts"

export class CellDefinition {
  name: string
  canEnter: boolean
  src: string
  baseUrl: string

  constructor(name: string, canEnter: boolean, src: string, baseUrl: string) {
    this.name = name
    this.canEnter = canEnter
    this.src = src
    this.baseUrl = baseUrl
  }
}

export class ItemDefinition {
  type: string
  src: string
  baseUrl: string

  constructor(type: string, src: string, baseUrl: string) {
    this.type = type
    this.src = src
    this.baseUrl = baseUrl
  }

  get href(): string {
    return new URL(this.src, this.baseUrl).href
  }
}

export class ActorDefinition {
  type: string
  main: string
  src: string
  baseUrl: string

  constructor(type: string, main: string, src: string, baseUrl: string) {
    this.type = type
    this.main = main
    this.src = src
    this.baseUrl = baseUrl
  }

  get href(): string {
    return new URL(this.src, this.baseUrl).href
  }
}

export class ObjectDefinition {
  type: string
  src: string
  baseUrl: string

  constructor(type: string, src: string, baseUrl: string) {
    this.type = type
    this.src = src
    this.baseUrl = baseUrl
  }

  get href(): string {
    return new URL(this.src, this.baseUrl).href
  }
}

export class Catalog {
  cells: Map<string, CellDefinition>
  items: Map<string, ItemDefinition>
  actors: Map<string, ActorDefinition>
  objects: Map<string, ObjectDefinition>

  // deno-lint-ignore no-explicit-any
  static fromJSON(json: any, url: string): Catalog {
    const catalog = new Catalog()
    for (const cellData of json.cells) {
      const cellDef = new CellDefinition(
        cellData.name,
        cellData.canEnter,
        cellData.src,
        url,
      )
      catalog.cells.set(cellDef.name, cellDef)
    }

    for (const itemType in json.items) {
      const itemDef = new ItemDefinition(
        itemType,
        json.items[itemType].src,
        url,
      )
      catalog.items.set(itemType, itemDef)
    }

    for (const actorType in json.actors) {
      const actorDef = new ActorDefinition(
        actorType,
        json.actors[actorType].main,
        json.actors[actorType].src,
        url,
      )
      catalog.actors.set(actorType, actorDef)
    }

    for (const objectType in json.objects) {
      const objectDef = new ObjectDefinition(
        objectType,
        json.objects[objectType].src,
        url,
      )
      catalog.objects.set(objectType, objectDef)
    }
    return catalog
  }

  constructor() {
    this.cells = new Map()
    this.items = new Map()
    this.actors = new Map()
    this.objects = new Map()
  }

  cell(name: string): CellDefinition | undefined {
    return this.cells.get(name)
  }

  item(type: string): ItemDefinition | undefined {
    return this.items.get(type)
  }

  actor(type: string): ActorDefinition | undefined {
    return this.actors.get(type)
  }

  object(type: string): ObjectDefinition | undefined {
    return this.objects.get(type)
  }
}

export async function loadCatalog(url: string): Promise<Catalog> {
  return Catalog.fromJSON(await loadJson(url), url)
}
