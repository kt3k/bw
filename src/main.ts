import { type Context, register } from "@kt3k/cell"
import { gameloop } from "@kt3k/gameloop"

function loadImage(path: string): Promise<Image> {
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

function loadImages(paths: string[]): Promise<Image[]> {
  return Promise.all(paths.map(loadImage))
}

function Canvas1({ el, pub }: Context<HTMLCanvasElement>) {
  const WIDTH = +el.width
  const HEIGHT = +el.height

  const W = Math.floor(WIDTH / 16)
  const H = Math.floor(HEIGHT / 16)

  const canvasCtx = el.getContext("2d")!

  /*
  for (const i of Array(W).keys()) {
    for (const j of Array(H).keys()) {
      canvasCtx.fillStyle = (i + j) % 2 === 0 ? "black" : "gray"
      canvasCtx.fillRect(i * 16, j * 16, 16, 16)
    }
  }
    */

  loadImages([
    "./src/images/char/juni/juni_b0.png",
    "./src/images/char/juni/juni_b1.png",
    "./src/images/char/juni/juni_f0.png",
    "./src/images/char/juni/juni_f1.png",
    "./src/images/char/juni/juni_l0.png",
    "./src/images/char/juni/juni_l1.png",
    "./src/images/char/juni/juni_r0.png",
    "./src/images/char/juni/juni_r1.png",
  ]).then((images) => {
    console.log(images)
    const loop = gameloop(() => {
      const i = Math.floor(Math.random() * W)
      const j = Math.floor(Math.random() * H)
      canvasCtx.clearRect(i * 16, j * 16, 16, 16)
      canvasCtx.drawImage(
        images[Math.floor(Math.random() * 8)],
        i * 16,
        j * 16,
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
