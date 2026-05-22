import { useEffect, useRef, useState } from 'react'
import { resolveMediaUrl } from '@/lib/mediaUrl'

type Props = {
  /** Ordered list of rendered slide image URLs (from server-side LibreOffice conversion). */
  slideImages: string[]
  /** 0-based slide index to display. */
  slideIndex: number
  className?: string
  onReadyChange?: (ready: boolean) => void
  onSlideCount?: (count: number) => void
}

/**
 * Displays server-side rendered slide images.
 * Only the current image is eagerly loaded; neighbors are prefetched silently.
 * Instant display — no PPTX parsing, no canvas rendering.
 */
export function SlideImageViewer({
  slideImages,
  slideIndex,
  className = '',
  onReadyChange,
  onSlideCount,
}: Props) {
  const clampedIndex = Math.max(0, Math.min(slideIndex, slideImages.length - 1))
  const src = resolveMediaUrl(slideImages[clampedIndex] ?? '')
  // Track which src has finished loading — avoids synchronous setState inside effects
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const isLoaded = loadedSrc === src
  const prefetchedRef = useRef<Set<string>>(new Set())

  // Report slide count once on mount
  useEffect(() => {
    if (slideImages.length > 0) onSlideCount?.(slideImages.length)
  }, [slideImages.length, onSlideCount])

  // Notify parent that the slide is not ready whenever src changes
  useEffect(() => {
    onReadyChange?.(false)
  }, [src, onReadyChange])

  // Prefetch previous and next slide images in the background
  useEffect(() => {
    const toPreload = [
      slideImages[clampedIndex - 1],
      slideImages[clampedIndex + 1],
      slideImages[clampedIndex + 2],
    ].filter((u): u is string => Boolean(u))

    for (const rawUrl of toPreload) {
      const url = resolveMediaUrl(rawUrl)
      if (prefetchedRef.current.has(url)) continue
      prefetchedRef.current.add(url)
      const img = new Image()
      img.src = url
    }
  }, [clampedIndex, slideImages])

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-white ${className}`}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
        </div>
      )}
      <img
        key={src}
        src={src}
        alt=""
        draggable={false}
        onLoad={() => {
          setLoadedSrc(src)
          onReadyChange?.(true)
        }}
        onError={() => {
          setLoadedSrc(src)
          onReadyChange?.(true)
        }}
        className={`h-full w-full object-contain transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
