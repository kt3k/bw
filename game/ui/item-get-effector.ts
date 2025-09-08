import type { Context } from "@kt3k/cell"
import { loadImage } from "../../util/load.ts"
import * as signal from "../../util/signal.ts"

export function ItemGetEffector({ el, subscribe }: Context) {
  let prevCount = signal.appleCount.get()
  subscribe(signal.appleCount, (count) => {
    const increased = count > prevCount
    prevCount = count
    if (!increased) {
      return
    }

    moveImage(el, "./item/apple.png", "10px")
  })

  let prevGreenAppleCount = signal.greenAppleCount.get()
  subscribe(signal.greenAppleCount, (count) => {
    const increased = count > prevGreenAppleCount
    prevGreenAppleCount = count
    if (!increased) {
      return
    }

    moveImage(el, "./item/green-apple.png", "36px")
  })
}

async function moveImage(
  el: HTMLElement,
  src: string,
  endTop: string,
): Promise<void> {
  const bmp = await loadImage(import.meta.resolve(src))
  const canvas = Object.assign(document.createElement("canvas"), {
    width: bmp.width,
    height: bmp.height,
    className: "absolute",
  })
  Object.assign(canvas.style, {
    right: "47%",
    top: "48%",
    opacity: "1",
    transition: "right 0.3s ease, top 0.3s ease, opacity 0.3s ease",
  })
  canvas.getContext("2d")!.drawImage(bmp, 0, 0)
  el.appendChild(canvas)
  canvas.addEventListener("transitionend", () => {
    el.removeChild(canvas)
  }, { once: true })
  setTimeout(
    () =>
      Object.assign(canvas.style, {
        right: "58px",
        top: endTop,
        opacity: "0.7",
      }),
    30,
  )
}
