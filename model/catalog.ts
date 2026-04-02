import { loadJson } from "../util/load.ts"

/** Shape of raw catalog json */
interface CatalogSource {
  readonly cells: Record<string, {
    readonly canEnter: boolean
    readonly src: string
    readonly noise?: string
  }>
  readonly items: Record<string, {
    readonly src: string
    readonly collect: string
  }>
  readonly actors: Record<string, {
    readonly moveEnd?: string
    readonly idle?: string
    readonly src: string
  }>
  readonly props: Record<string, {
    readonly src: string
    readonly canEnter: boolean
    readonly onEnter?: string
    readonly pushed?: string
    readonly data?: Record<string, unknown>
  }>
}

/** Parsed cell definition */
export interface CellDefinition {
  readonly name: string
  readonly canEnter: boolean
  readonly src: string
  readonly href: string
  readonly noise?: string
}

/** Parsed item definition */
export interface ItemDefinition {
  readonly type: string
  readonly collect: string
  readonly src: string
  readonly href: string
}

/** Parsed actor definition */
export interface ActorDefinition {
  readonly type: string
  readonly moveEnd?: string
  readonly idle?: string
  readonly src: string
  readonly href: string
}

/** Parsed prop definition */
export interface PropDefinition {
  readonly type: string
  readonly canEnter: boolean
  readonly pushed?: string
  readonly onEnter?: string
  readonly src: string
  readonly href: string
  readonly data?: Record<string, unknown>
}

/** The catalog class */
export class Catalog {
  readonly refs: string[]
  readonly cells: Record<string, CellDefinition> = {}
  readonly items: Record<string, ItemDefinition> = {}
  readonly actors: Record<string, ActorDefinition> = {}
  readonly props: Record<string, PropDefinition> = {}

  static fromJSON(
    source: { src: string; json: CatalogSource }[],
    baseUrl: string,
  ): Catalog {
    const catalog = new Catalog(source.map(({ src }) => src))
    for (const { src, json } of source) {
      const url = new URL(src, baseUrl).href
      for (const [name, data] of Object.entries(json.cells)) {
        catalog.cells[name] = {
          name,
          canEnter: data.canEnter,
          src: data.src,
          href: new URL(data.src, url).href,
          noise: data.noise,
        }
      }

      for (const [type, data] of Object.entries(json.items)) {
        catalog.items[type] = {
          type: type,
          collect: data.collect,
          src: data.src,
          href: new URL(data.src, url).href,
        }
      }

      for (const [type, data] of Object.entries(json.actors)) {
        catalog.actors[type] = {
          type: type,
          moveEnd: data.moveEnd,
          idle: data.idle,
          src: data.src,
          href: new URL(data.src, url).href,
        }
      }

      for (const [type, data] of Object.entries(json.props)) {
        catalog.props[type] = {
          type: type,
          canEnter: data.canEnter,
          onEnter: data.onEnter,
          pushed: data.pushed,
          src: data.src,
          href: new URL(data.src, url).href,
          data: data.data,
        }
      }
    }
    return catalog
  }

  constructor(refs: string[]) {
    this.refs = refs
  }

  toJSON(): CatalogSource {
    const cells: CatalogSource["cells"] = {}
    for (const def of Object.values(this.cells)) {
      cells[def.name] = {
        canEnter: def.canEnter,
        src: def.src,
        noise: def.noise,
      }
    }

    const items: CatalogSource["items"] = {}
    for (const def of Object.values(this.items)) {
      items[def.type] = {
        src: def.src,
        collect: def.collect,
      }
    }

    const actors: CatalogSource["actors"] = {}
    for (const def of Object.values(this.actors)) {
      actors[def.type] = {
        moveEnd: def.moveEnd,
        idle: def.idle,
        src: def.src,
      }
    }

    const props: CatalogSource["props"] = {}
    for (const def of Object.values(this.props)) {
      props[def.type] = {
        src: def.src,
        canEnter: def.canEnter,
        onEnter: def.onEnter,
        pushed: def.pushed,
        data: def.data,
      }
    }

    return { cells, items, actors, props }
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
