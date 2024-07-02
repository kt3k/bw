import { type Context, register } from "@kt3k/cell"
import { gameloop } from "@kt3k/gameloop"

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
    this.ctx.clearRect(x, y, w, h)
    this.ctx.drawImage(img, x, y)
  }
}

function Canvas1({ el, pub }: Context<HTMLCanvasElement>) {
  const WIDTH = el.width
  const HEIGHT = el.height

  const W = Math.floor(WIDTH / 16)
  const H = Math.floor(HEIGHT / 16)

  const canvasCtx = el.getContext("2d")!
  const brush = new Brush(canvasCtx)

  loadImages([
    "./char/juni/juni_b0.png",
    "./char/juni/juni_b1.png",
    "./char/juni/juni_f0.png",
    "./char/juni/juni_f1.png",
    "./char/juni/juni_l0.png",
    "./char/juni/juni_l1.png",
    "./char/juni/juni_r0.png",
    "./char/juni/juni_r1.png",
  ]).then((images) => {
    const loop = gameloop(() => {
      const i = Math.floor(Math.random() * W)
      const j = Math.floor(Math.random() * H)
      brush.drawImage(
        images[Math.floor(Math.random() * 8)],
        i * 16,
        j * 16,
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

function FPSMonitor({ sub, on, el }: Context) {
  sub("fps")
  on.fps = (e: CustomEvent) => {
    el.textContent = e.detail.toFixed(2)
  }
  return "0"
}

register(Canvas1, "canvas1")
register(Canvas2, "canvas2")
register(FPSMonitor, "js-fps-monitor")
