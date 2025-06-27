import type { Context } from "@kt3k/cell"
import { appleCountSignal } from "../../util/signal.ts"

export function ItemGetEffector({ el, subscribe }: Context) {
  let prevCount = appleCountSignal.get()
  subscribe(appleCountSignal, (count) => {
    const increased = count > prevCount
    prevCount = count
    if (!increased) {
      return
    }

    const img = new Image()
    img.src = "./item/apple.png"
    img.className = "absolute"
    img.style.right = "47%"
    img.style.top = "48%"
    img.style.opacity = "1"
    img.style.transition = "right 0.3s ease, top 0.3s ease, opacity 0.3s ease"
    img.onload = () => {
      el.appendChild(img)
      setTimeout(() => {
        img.style.right = "58px"
        img.style.top = "10px"
        img.style.opacity = "0.7"
      }, 30)
      img.addEventListener("transitionend", () => {
        el.removeChild(img)
      }, { once: true })
    }
  })
}
