/** Fit a presentation box inside a container (contain), default 16:9. */
export function fitPresentationBox(
  containerW: number,
  containerH: number,
  aspect = 16 / 9,
): { width: number; height: number } {
  if (containerW <= 0 || containerH <= 0) {
    return { width: 960, height: Math.round(960 / aspect) }
  }
  const containerAspect = containerW / containerH
  if (containerAspect > aspect) {
    const height = Math.floor(containerH)
    const width = Math.floor(height * aspect)
    return { width, height }
  }
  const width = Math.floor(containerW)
  const height = Math.floor(width / aspect)
  return { width, height }
}

/** Scale pptx-preview canvas so the slide fits without internal scrolling. */
export function scalePptxCanvasToFit(container: HTMLElement | null): void {
  if (!container) return
  const wrapper = container.querySelector('.pptx-preview-wrapper') as HTMLElement | null
  const canvas = container.querySelector('canvas') as HTMLCanvasElement | null
  if (!wrapper || !canvas) return

  wrapper.style.transform = ''
  wrapper.style.width = ''
  wrapper.style.height = ''

  const cw = container.clientWidth
  const ch = container.clientHeight
  const nw = canvas.width || canvas.offsetWidth
  const nh = canvas.height || canvas.offsetHeight
  if (!nw || !nh || !cw || !ch) return

  const scale = Math.min(cw / nw, ch / nh, 1)
  wrapper.style.transformOrigin = 'center center'
  wrapper.style.transform = `scale(${scale})`
}
