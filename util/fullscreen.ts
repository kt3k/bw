export function bindToggleFullscreenOnce() {
  document.removeEventListener("keyup", toggleFullscreen)
  document.addEventListener("keyup", toggleFullscreen, { once: true })
  document.body.removeEventListener("touchend", toggleFullscreen)
  document.body.addEventListener("touchend", toggleFullscreen, { once: true })
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}
