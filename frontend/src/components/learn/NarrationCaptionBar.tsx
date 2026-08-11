import { Volume2, VolumeX } from 'lucide-react'

type Props = {
  text?: string
  muted: boolean
  playing: boolean
  onToggleMute: () => void
  className?: string
}

/** Caption + mute toggle for AI-narrated slide pages. Purely visual — the single
 *  shared <audio> element lives once at the LearnPage root (see useNarrationAudioPlayer);
 *  this can safely render in more than one place (e.g. normal + fullscreen stage)
 *  since it owns no audio itself. Renders nothing when there's no caption yet. */
export function NarrationCaptionBar({ text, muted, playing, onToggleMute, className = '' }: Props) {
  if (!text) return null
  return (
    <div
      className={`pointer-events-auto flex items-start gap-2 rounded-xl bg-slate-900/85 px-3 py-2 text-xs text-white shadow-lg backdrop-blur sm:text-sm ${className}`}
    >
      <button
        type="button"
        onClick={onToggleMute}
        className="mt-0.5 shrink-0 rounded-full bg-white/10 p-1.5 transition hover:bg-white/20"
        aria-label={muted ? 'Play narration' : 'Mute narration'}
        title={muted ? 'Play narration' : 'Mute narration'}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className={`h-4 w-4 ${playing ? 'text-sky-300' : ''}`} />}
      </button>
      <p className="leading-snug">{text}</p>
    </div>
  )
}
