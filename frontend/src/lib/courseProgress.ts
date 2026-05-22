/** Course completion % for slides or video-based training. */
export function courseProgressPercent(opts: {
  totalSlides: number
  slideIndex: number
  maxSlideIndex?: number
  completedSlides: boolean
  videoCourse?: boolean
  videoWatchPct?: number
}): number {
  const { totalSlides, slideIndex, maxSlideIndex = 0, completedSlides, videoCourse, videoWatchPct = 0 } = opts
  if (videoCourse) {
    if (completedSlides) return 100
    return Math.min(100, Math.max(0, Math.round(videoWatchPct)))
  }
  if (totalSlides <= 0) return 0
  if (completedSlides) return 100
  const furthest = Math.max(0, slideIndex, maxSlideIndex)
  return Math.min(100, Math.round(((furthest + 1) / totalSlides) * 100))
}
