import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveMediaUrl } from '@/lib/mediaUrl'

/**
 * Drives a SINGLE persistent <audio> element for per-slide narration playback.
 *
 * Safari/WebKit unlocks autoplay-with-sound per ELEMENT, not per origin/tab: a fresh
 * `<audio src=...>` mounted for each new slide would start "locked" again every time,
 * regardless of earlier interaction elsewhere on the page. Reusing one HTMLMediaElement
 * (only ever swapping `.src`) is what lets a single real user gesture — the first
 * unmute click — carry forward to every later slide's `.play()` call.
 *
 * Starts muted (universally permitted autoplay everywhere) with a visible unmute
 * affordance; the first unmute click is a real gesture, synchronously unmuting +
 * playing on the already-loaded element, which is what "spends" the unlock.
 */
export function useNarrationAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)
  // True once the currently-loaded clip has played to its natural end (native `ended`
  // event) — the signal LearnPage gates "mandatory full listen" navigation on. Reset to
  // false whenever a new clip is loaded (playUrl) or a clip is replayed from 0 (unmute).
  const [ended, setEnded] = useState(false)
  // 0-100 playback position of the currently-loaded clip, for the on-screen progress bar
  // that replaces the old fixed-duration dwell timer.
  const [progressPct, setProgressPct] = useState(0)
  const currentUrlRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    // Set once, imperatively, on mount — deliberately NOT a React `muted` prop on the
    // <audio> element. A declarative prop would be re-asserted on every re-render and
    // fight the imperative `audio.muted = false` that unmute() performs afterward.
    audio.muted = true
    const onEnded = () => {
      setPlaying(false)
      setEnded(true)
      setProgressPct(100)
    }
    const onPause = () => setPlaying(false)
    const onTimeUpdate = () => {
      if (audio.duration > 0 && Number.isFinite(audio.duration)) {
        setProgressPct(Math.min(100, Math.round((audio.currentTime / audio.duration) * 100)))
      }
    }
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => {
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTimeUpdate)
    }
  }, [])

  /** Call when the active slide/language changes. Stops any current clip first (before
   *  swapping src, so a stale clip never audibly overlaps the new one), then loads and
   *  attempts to play the new one at the current mute state. */
  const playUrl = useCallback((url: string | undefined) => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setPlaying(false)
    setEnded(false)
    setProgressPct(0)
    currentUrlRef.current = url
    if (!url) {
      audio.removeAttribute('src')
      return
    }
    audio.src = resolveMediaUrl(url)
    audio.load()
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false)) // autoplay blocked (still muted, or no prior gesture) — fine, unmute button covers it
  }, [])

  /** The unmute button's click handler IS the user gesture that unlocks this element
   *  for every subsequent .src swap + .play() call, including on later slides. */
  const unmute = useCallback(() => {
    const audio = audioRef.current
    setMuted(false)
    if (!audio) return
    audio.muted = false
    if (currentUrlRef.current) {
      audio.currentTime = 0
      setEnded(false)
      setProgressPct(0)
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    }
  }, [])

  const mute = useCallback(() => {
    setMuted(true)
    if (audioRef.current) audioRef.current.muted = true
  }, [])

  return { audioRef, muted, playing, ended, progressPct, playUrl, unmute, mute }
}
