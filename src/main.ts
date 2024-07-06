import { type Context, register } from "@kt3k/cell"
import { gameloop } from "@kt3k/gameloop"
import { Input, KeyMonitor } from "./ui/KeyMonitor.ts"

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

class Brush {
  constructor(public ctx: CanvasRenderingContext2D) {}

  drawImage(img: HTMLImageElement, x: number, y: number) {
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
  state: State = "down"
  i: number
  j: number
  d: number = 0
  isMoving: boolean = false

  constructor(i: number, j: number) {
    this.i = i
    this.j = j
  }

  setState(state: State) {
    this.state = state
  }

  readInput(input: typeof Input) {
    if (input.up) {
      this.setState(UP)
    } else if (input.down) {
      this.setState(DOWN)
    } else if (input.left) {
      this.setState(LEFT)
    } else if (input.right) {
      this.setState(RIGHT)
    }
  }

  step(input: typeof Input) {
    if (this.isMoving) {
      this.d += 1
      if (this.d == 16) {
        this.d = 0
        this.isMoving = false
        if (this.state === UP) {
          this.j -= 1
        } else if (this.state === DOWN) {
          this.j += 1
        } else if (this.state === LEFT) {
          this.i -= 1
        } else if (this.state === RIGHT) {
          this.i += 1
        }
      }
      return
    }

    if (input.up || input.down || input.left || input.right) {
      this.isMoving = true
      this.readInput(input)
    }
  }

  appearance() {
    if (this.d >= 8) {
      return `./char/juni/juni_${this.state}0.png`
    } else {
      return `./char/juni/juni_${this.state}1.png`
    }
  }

  getX() {
    if (this.isMoving) {
      if (this.state === LEFT) {
        return this.i * 16 - this.d
      } else if (this.state === RIGHT) {
        return this.i * 16 + this.d
      }
    }
    return this.i * 16
  }
  getY() {
    if (this.isMoving) {
      if (this.state === UP) {
        return this.j * 16 - this.d
      } else if (this.state === DOWN) {
        return this.j * 16 + this.d
      }
    }
    return this.j * 16
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
  const canvasCtx = el.getContext("2d")!
  const brush = new Brush(canvasCtx)

  const character = new Character(5, 5)
  const assetManager = new AssetManager()

  assetManager.loadImages(character.assets()).then(() => {
    const loop = gameloop(() => {
      character.step(Input)

      brush.clear()
      brush.drawImage(
        assetManager.getImage(character.appearance()),
        character.getX(),
        character.getY(),
      )
    }, 60)
    loop.onStep((fps) => pub("fps", fps))
    loop.run()
  })
}

function Canvas2({ el }: Context<HTMLCanvasElement>) {
  const WIDTH = el.width
  const HEIGHT = el.height
  const W = Math.floor(WIDTH / 16)
  const H = Math.floor(HEIGHT / 16)
  const canvasCtx = el.getContext("2d")!
  canvasCtx.fillStyle = "black"
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)

  for (let i = 0; i < W; i++) {
    for (let j = 0; j < H; j++) {
      canvasCtx.fillStyle = (i + j) % 2 === 0 ? "gray" : "black"
      canvasCtx.fillRect(i * 16, j * 16, 16, 16)
    }
  }
}

function FpsMonitor({ sub, on, el }: Context) {
  sub("fps")
  on.fps = (e: CustomEvent) => {
    el.textContent = e.detail.toFixed(2)
  }
  return "0"
}

register(Canvas1, "canvas1")
register(Canvas2, "canvas2")
register(FpsMonitor, "js-fps-monitor")
register(KeyMonitor, "js-key-monitor")
