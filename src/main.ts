import { type Context, register } from "@kt3k/cell";
import { gameloop } from "@kt3k/gameloop";

function Hello() {
  return "hello, world!";
}

function Canvas1({ el, pub }: Context<HTMLCanvasElement>) {
  const WIDTH = +el.width;
  const HEIGHT = +el.height;

  const W = Math.floor(WIDTH / 16);
  const H = Math.floor(HEIGHT / 16);

  const canvasCtx = el.getContext("2d")!;

  for (const i of Array(W).keys()) {
    for (const j of Array(H).keys()) {
      canvasCtx.fillStyle = (i + j) % 2 === 0 ? "black" : "gray";
      canvasCtx.fillRect(i * 16, j * 16, 16, 16);
    }
  }

  const loop = gameloop(() => {
    for (const _ of Array(W).keys()) {
      const i = Math.floor(Math.random() * W);
      const j = Math.floor(Math.random() * H);
      canvasCtx.fillStyle = Math.random() > 0.5 ? "black" : "gray";
      canvasCtx.fillRect(i * 16, j * 16, 16, 16);
    }
  }, 60);
  loop.onStep((fps) => pub("fps", fps));
  loop.run();
}

function Canvas2({ el }: Context<HTMLCanvasElement>) {
  const WIDTH = +el.width;
  const HEIGHT = +el.height;
  const canvasCtx = el.getContext("2d")!;
  canvasCtx.fillStyle = "black";
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
}

function FPSMonitor({ sub, on, el }: Context) {
  sub("fps");
  on.fps = (e: CustomEvent) => {
    el.textContent = e.detail.toFixed(2);
  };
  return "0";
}

register(Hello, "hello");
register(Canvas1, "canvas1");
register(Canvas2, "canvas2");
register(FPSMonitor, "js-fps-monitor");
