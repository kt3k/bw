import { loadJson } from "../util/load.ts"

interface CatalogSource {
  cells: Record<string, {
    canEnter: boolean
    src: string
  }>
  items: Record<string, {
    src: string
  }>
  actors: Record<string, {
    main: string
    src: string
  }>
  props: Record<string, {
    src: string
    canEnter: boolean
  }>
}

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

  get href(): string {
    return new URL(this.src, this.baseUrl).href
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

export class PropDefinition {
  type: string
  canEnter: boolean
  src: string
  baseUrl: string

  constructor(type: string, canEnter: boolean, src: string, baseUrl: string) {
    this.type = type
    this.canEnter = canEnter
    this.src = src
    this.baseUrl = baseUrl
  }

  get href(): string {
    return new URL(this.src, this.baseUrl).href
  }
}

export class Catalog {
  refs: string[]
  cells: Map<string, CellDefinition>
  items: Map<string, ItemDefinition>
  actors: Map<string, ActorDefinition>
  props: Map<string, PropDefinition>

  static fromJSON(
    source: { src: string; json: CatalogSource }[],
    baseUrl: string,
  ): Catalog {
    const catalog = new Catalog(source.map(({ src }) => src))
    for (const { src, json } of source) {
      const url = new URL(src, baseUrl).href
      for (const [name, cellData] of Object.entries(json.cells)) {
        const cellDef = new CellDefinition(
          name,
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

      for (const objectType in json.props) {
        const objectDef = new PropDefinition(
          objectType,
          json.props[objectType].canEnter,
          json.props[objectType].src,
          url,
        )
        catalog.props.set(objectType, objectDef)
      }
    }
    return catalog
  }

  constructor(refs: string[] = []) {
    this.refs = refs
    this.cells = new Map()
    this.items = new Map()
    this.actors = new Map()
    this.props = new Map()
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

  object(type: string): PropDefinition | undefined {
    return this.props.get(type)
  }

  merge(other: Catalog): Catalog {
    for (const [name, cellDef] of other.cells) {
      this.cells.set(name, cellDef)
    }
    for (const [type, itemDef] of other.items) {
      this.items.set(type, itemDef)
    }
    for (const [type, actorDef] of other.actors) {
      this.actors.set(type, actorDef)
    }
    for (const [type, objectDef] of other.props) {
      this.props.set(type, objectDef)
    }
    return this
  }

  toJSON(): object {
    const cells: object[] = []
    for (const cellDef of this.cells.values()) {
      cells.push({
        name: cellDef.name,
        canEnter: cellDef.canEnter,
        src: cellDef.src,
      })
    }

    const items: Record<string, object> = {}
    for (const itemDef of this.items.values()) {
      items[itemDef.type] = {
        src: itemDef.src,
      }
    }

    const actors: Record<string, object> = {}
    for (const actorDef of this.actors.values()) {
      actors[actorDef.type] = {
        main: actorDef.main,
        src: actorDef.src,
      }
    }

    const objects: Record<string, object> = {}
    for (const objectDef of this.props.values()) {
      objects[objectDef.type] = {
        src: objectDef.src,
      }
    }

    return {
      cells,
      items,
      actors,
      objects,
    }
  }
}

export async function loadCatalog(
  baseUrl: string,
  srcs: string[],
  // deno-lint-ignore no-explicit-any
  options?: { loadJson?: (url: string) => Promise<any> },
): Promise<Catalog> {
  const loader = options?.loadJson ?? loadJson
  const catalogs = await Promise.all(
    srcs.map(async (src) => {
      const url = new URL(src, baseUrl).href
      const json = await loader(url)
      return { src, json }
    }),
  )
  return Catalog.fromJSON(catalogs, baseUrl)
}
