import { useCallback, useEffect, useRef, useState } from 'react'
import { Film } from 'lucide-react'
import { t } from '@/i18n/t'

const END_TOLERANCE_SEC = 2
const SEEK_AHEAD_TOLERANCE_SEC = 1.5

function clampResumeTime(sec: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return Math.max(0, sec)
  return Math.max(0, Math.min(sec, duration - 0.5))
}

function clampMaxWatched(sec: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return Math.max(0, sec)
  return Math.max(0, Math.min(sec, duration - END_TOLERANCE_SEC))
}

type Props = {
  src: string
  title?: string
  /** Furthest point legitimately reached (e.g. from saved progress). */
  initialMaxTimeSec?: number
  onProgress?: (maxTimeSec: number, durationSec: number) => void
  onComplete: (watchedSec: number, durationSec: number) => void
  /** Learn page: video only inside the frame; progress UI lives in the page footer. */
  frameOnly?: boolean
}

/** Requires watching through to the end; blocks skipping ahead in the native controls. */
export function VideoSlidePlayer({
  src,
  title,
  initialMaxTimeSec = 0,
  onProgress,
  onComplete,
  frameOnly = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const maxWatchedRef = useRef(Math.max(0, initialMaxTimeSec))
  const completedRef = useRef(false)
  const [watchPct, setWatchPct] = useState(0)
  const [finished, setFinished] = useState(false)
  const [mediaError, setMediaError] = useState(false)

  const tryComplete = useCallback(
    (video: HTMLVideoElement) => {
      if (completedRef.current) return
      const duration = video.duration
      if (!Number.isFinite(duration) || duration <= 0) return
      if (maxWatchedRef.current < duration - END_TOLERANCE_SEC) return
      completedRef.current = true
      setFinished(true)
      setWatchPct(100)
      onComplete(maxWatchedRef.current, duration)
    },
    [onComplete],
  )

  useEffect(() => {
    maxWatchedRef.current = Math.max(0, initialMaxTimeSec)
    completedRef.current = false
    setFinished(false)
    setWatchPct(0)
    setMediaError(false)
  }, [src, initialMaxTimeSec])

  const syncMaxWatchedToDuration = (duration: number) => {
    const clamped = clampMaxWatched(maxWatchedRef.current, duration)
    if (clamped !== maxWatchedRef.current) {
      maxWatchedRef.current = clamped
    }
    return clamped
  }

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video || completedRef.current) return
    const t = video.currentTime
    if (t > maxWatchedRef.current + SEEK_AHEAD_TOLERANCE_SEC) {
      video.currentTime = maxWatchedRef.current
      return
    }
    if (t > maxWatchedRef.current) {
      maxWatchedRef.current = t
    }
    const duration = video.duration
    if (Number.isFinite(duration) && duration > 0) {
      syncMaxWatchedToDuration(duration)
      const pct = Math.min(100, Math.round((maxWatchedRef.current / duration) * 100))
      setWatchPct(pct)
      onProgress?.(maxWatchedRef.current, duration)
      if (maxWatchedRef.current >= duration - END_TOLERANCE_SEC) {
        tryComplete(video)
      }
    }
  }

  const handleSeeking = () => {
    const video = videoRef.current
    if (!video || completedRef.current) return
    if (video.currentTime > maxWatchedRef.current + SEEK_AHEAD_TOLERANCE_SEC) {
      video.currentTime = maxWatchedRef.current
    }
  }

  const handleLoadedMetadata = () => {
    const video = videoRef.current
    if (!video) return
    const duration = video.duration
    if (!Number.isFinite(duration) || duration <= 0) return
    syncMaxWatchedToDuration(duration)
    const resume = clampResumeTime(maxWatchedRef.current, duration)
    if (resume > 0 && video.currentTime < resume - 0.5) {
      video.currentTime = resume
    }
    setWatchPct(Math.min(100, Math.round((maxWatchedRef.current / duration) * 100)))
    if (maxWatchedRef.current >= duration - END_TOLERANCE_SEC) {
      tryComplete(video)
    }
  }

  const handleEnded = () => {
    const video = videoRef.current
    if (!video) return
    const duration = video.duration
    if (!Number.isFinite(duration) || duration <= 0) return
    if (video.currentTime > maxWatchedRef.current) {
      maxWatchedRef.current = video.currentTime
    }
    syncMaxWatchedToDuration(duration)
    tryComplete(video)
  }

  const errorOverlay = (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 p-6 text-center">
      <div>
        <Film className="mx-auto mb-3 h-10 w-10 text-slate-500" aria-hidden />
        <p className="text-sm font-semibold text-slate-200">Video is being processed</p>
        <p className="mt-1 text-xs text-slate-400">
          This video is being converted for browser playback. Please refresh the page in a moment.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
        >
          Refresh now
        </button>
      </div>
    </div>
  )

  if (frameOnly) {
    if (mediaError) return errorOverlay
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <video
          ref={videoRef}
          key={src}
          src={src}
          title={title}
          controls
          playsInline
          controlsList="nodownload"
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={() => setMediaError(true)}
          className="max-h-full max-w-full"
        >
          <track kind="captions" />
        </video>
      </div>
    )
  }

  if (mediaError) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col items-center justify-center">
        {errorOverlay}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-3">
      <video
        ref={videoRef}
        key={src}
        src={src}
        title={title}
        controls
        playsInline
        controlsList="nodownload"
        onTimeUpdate={handleTimeUpdate}
        onSeeking={handleSeeking}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setMediaError(true)}
        className="max-h-full max-w-full rounded-lg object-contain shadow-sm ring-1 ring-slate-200/80"
      >
        <track kind="captions" />
      </video>
      <div className="w-full max-w-md px-2">
        <div className="flex items-center justify-between gap-2 text-[10px] font-medium text-slate-600 sm:text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden />
            {finished
              ? t('ui_learn_video_complete', {
                  defaultValue: 'Video completed. You can take the knowledge check.',
                })
              : t('ui_learn_video_watch_full', {
                  defaultValue: 'Watch the full video to unlock the knowledge check.',
                })}
          </span>
          <span className="tabular-nums text-sky-800">{watchPct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${finished ? 'bg-emerald-500' : 'bg-gradient-to-r from-sky-500 to-amber-400'}`}
            style={{ width: `${watchPct}%` }}
          />
        </div>
        {!finished ? (
          <p className="mt-1.5 text-center text-[10px] text-slate-500">
            {t('ui_learn_video_no_skip', {
              defaultValue: 'Skipping ahead is disabled until you have watched the full video.',
            })}
          </p>
        ) : null}
      </div>
    </div>
  )
}
