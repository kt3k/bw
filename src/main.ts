import { type Context, register } from "@kt3k/cell"
import { gameloop } from "@kt3k/gameloop"

/** Returns a random non-negative integer under `n` */
function randomInt(n: number) {
  return Math.floor(Math.random() * n)
}

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve(img)
    }
    img.onerror = (e) => {
      reject(e)
    }
    img.src = path
  })
}

function loadImages(paths: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(paths.map(loadImage))
}

class Brush {
  constructor(public ctx: CanvasRenderingContext2D) {}

  drawImage(img: HTMLImageElement, x: number, y: number, w: number, h: number) {
    this.ctx.drawImage(img, x, y)
  }

  clear() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
  }
}

class AssetManager {
  images: { [key: string]: HTMLImageElement } = {}

  async loadImages(paths: string[]) {
    const images = await Promise.all(paths.map(loadImage))

    paths.forEach((path, i) => {
      this.images[path] = images[i]
    })
  }

  getImage(path: string): HTMLImageElement {
    return this.images[path]
  }
}

/** State of characters */
const UP = "up"
const DOWN = "down"
const LEFT = "left"
const RIGHT = "right"
const STATE = {
  UP,
  DOWN,
  LEFT,
  RIGHT,
} as const
type State = typeof STATE[keyof typeof STATE]

class Character {
  state: State
  i: number
  j: number

  constructor() {
    this.state = "down"
    this.i = 5
    this.j = 5
  }

  setState(state: State) {
    this.state = state
  }

  readInput(input: typeof Input) {
    if (input.up) {
      this.setState(UP)
      this.j--
    } else if (input.down) {
      this.setState(DOWN)
      this.j++
    } else if (input.left) {
      this.setState(LEFT)
      this.i--
    } else if (input.right) {
      this.setState(RIGHT)
      this.i++
    }
  }

  appearance() {
    return `./char/juni/juni_${this.state}0.png`
  }

  assets() {
    const assets = []
    for (const state of Object.values(STATE)) {
      assets.push(
        `./char/juni/juni_${state}0.png`,
        `./char/juni/juni_${state}1.png`,
      )
    }
    return assets
  }
}

function Canvas1({ el, pub }: Context<HTMLCanvasElement>) {
  const COLUMNS = Math.floor(el.width / 16)
  const ROWS = Math.floor(el.height / 16)

  const canvasCtx = el.getContext("2d")!
  const brush = new Brush(canvasCtx)

  const character = new Character()
  const assetManager = new AssetManager()

  let i = 0

  assetManager.loadImages(character.assets()).then(() => {
    const loop = gameloop(() => {
      i++
      if (i % 8 !== 0) {
        return
      }
      character.readInput(Input)

      brush.clear()
      brush.drawImage(
        assetManager.getImage(character.appearance()),
        character.i * 16,
        character.j * 16,
        16,
        16,
      )
    }, 60)
    loop.onStep((fps) => pub("fps", fps))
    loop.run()
  })
}

function Canvas2({ el }: Context<HTMLCanvasElement>) {
  const WIDTH = +el.width
  const HEIGHT = +el.height
  const canvasCtx = el.getContext("2d")!
  canvasCtx.fillStyle = "black"
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)
}

function FpsMonitor({ sub, on, el }: Context) {
  sub("fps")
  on.fps = (e: CustomEvent) => {
    el.textContent = e.detail.toFixed(2)
  }
  return "0"
}

const Input = {
  up: false,
  down: false,
  left: false,
  right: false,
}

const KEY_UP = new Set(["ArrowUp", "w", "k"])
const KEY_DOWN = new Set(["ArrowDown", "s", "j"])
const KEY_LEFT = new Set(["ArrowLeft", "a", "h"])
const KEY_RIGHT = new Set(["ArrowRight", "d", "l"])

function KeyMonitor({ on, query }: Context) {
  on.keydown = (e: KeyboardEvent) => {
    if (KEY_UP.has(e.key)) {
      Input.up = true
    } else if (KEY_DOWN.has(e.key)) {
      Input.down = true
    } else if (KEY_LEFT.has(e.key)) {
      Input.left = true
    } else if (KEY_RIGHT.has(e.key)) {
      Input.right = true
    }
    renderLabel()
  }
  on.keyup = (e: KeyboardEvent) => {
    if (KEY_UP.has(e.key)) {
      Input.up = false
    } else if (KEY_DOWN.has(e.key)) {
      Input.down = false
    } else if (KEY_LEFT.has(e.key)) {
      Input.left = false
    } else if (KEY_RIGHT.has(e.key)) {
      Input.right = false
    }
    renderLabel()
  }

  const renderLabel = () => {
    const label = query(".current-input")
    if (label) {
      label.textContent = (Input.up ? "↑" : "") +
        (Input.down ? "↓" : "") +
        (Input.left ? "←" : "") +
        (Input.right ? "→" : "")
    }
  }
  renderLabel()
}

register(Canvas1, "canvas1")
register(Canvas2, "canvas2")
register(FpsMonitor, "js-fps-monitor")
register(KeyMonitor, "js-key-monitor")
