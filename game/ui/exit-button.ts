import type { Context } from "@kt3k/cell"

export function ExitButton({ on }: Context) {
  on("click", () => {
    console.log("Exit button clicked")
    const [i, j] = [-9964, -9981]
    location.hash = ""
    setTimeout(() => {
      location.replace(`#${i},${j}`)
    }, 10)
  })
}
