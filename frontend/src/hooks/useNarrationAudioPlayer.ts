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
 *
 * IMPORTANT: listeners are bound via a callback ref when `<audio>` actually mounts.
 * LearnPage often early-returns (loading / knowledge check) before the element exists —
 * a mount-only `useEffect([])` would see `audioRef.current === null` and never attach
 * `ended`/`timeupdate`, leaving Next stuck until a refresh hydrates progress.
 */
export function useNarrationAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** Bumps when the <audio> node mounts/unmounts so we (re)bind listeners. */
  const [audioEpoch, setAudioEpoch] = useState(0)
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
  const mutedRef = useRef(true)

  const startClip = useCallback((audio: HTMLAudioElement, url: string | undefined) => {
    audio.pause()
    audio.currentTime = 0
    setPlaying(false)
    setEnded(false)
    setProgressPct(0)
    currentUrlRef.current = url
    if (!url) {
      audio.removeAttribute('src')
      setEnded(true)
      setProgressPct(100)
      return
    }
    audio.src = resolveMediaUrl(url)
    audio.load()
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false))
  }, [])

  const setAudioNode = useCallback(
    (el: HTMLAudioElement | null) => {
      audioRef.current = el
      setAudioEpoch((n) => n + 1)
      // If LearnPage asked to play before <audio> existed, start now.
      if (el && currentUrlRef.current) {
        startClip(el, currentUrlRef.current)
      }
    },
    [startClip],
  )

  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Imperative mute — do not use a React `muted` prop (re-renders would fight unmute()).
    audio.muted = mutedRef.current

    const markComplete = () => {
      setPlaying(false)
      setEnded(true)
      setProgressPct(100)
    }
    const onEnded = () => markComplete()
    const onPause = () => setPlaying(false)
    const onTimeUpdate = () => {
      if (audio.duration > 0 && Number.isFinite(audio.duration)) {
        const pct = Math.min(100, Math.round((audio.currentTime / audio.duration) * 100))
        setProgressPct(pct)
        // Some browsers stall near EOF without firing `ended`.
        if (audio.currentTime >= audio.duration - 0.35) markComplete()
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
  }, [audioEpoch])

  /** Call when the active slide/language changes. Stops any current clip first (before
   *  swapping src, so a stale clip never audibly overlaps the new one), then loads and
   *  attempts to play the new one at the current mute state. */
  const playUrl = useCallback(
    (url: string | undefined) => {
      currentUrlRef.current = url
      const audio = audioRef.current
      if (!audio) {
        // Element not mounted yet (loading shell / knowledge check). Remember the URL;
        // setAudioNode will start it when <audio> appears. Without audio there is nothing
        // to wait on — leave ended false until mount so we don't unlock Next early.
        setPlaying(false)
        setEnded(!url)
        setProgressPct(url ? 0 : 100)
        return
      }
      startClip(audio, url)
    },
    [startClip],
  )

  /** The unmute button's click handler IS the user gesture that unlocks this element
   *  for every subsequent .src swap + .play() call, including on later slides. */
  const unmute = useCallback(() => {
    const audio = audioRef.current
    setMuted(false)
    mutedRef.current = false
    if (!audio) return
    audio.muted = false
    if (currentUrlRef.current) {
      startClip(audio, currentUrlRef.current)
      audio.muted = false
    }
  }, [startClip])

  const mute = useCallback(() => {
    setMuted(true)
    mutedRef.current = true
    if (audioRef.current) audioRef.current.muted = true
  }, [])

  return { audioRef: setAudioNode, muted, playing, ended, progressPct, playUrl, unmute, mute }
}
