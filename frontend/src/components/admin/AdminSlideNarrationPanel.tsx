import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, Volume2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useAdminNarrationStatus } from '@/hooks/useAdminNarrationStatus'
import { editNarrationText, retryNarration, type NarrationPerLangStatus } from '@/api/localData'
import { resolveMediaUrl } from '@/lib/mediaUrl'

const LANG_LABEL: Record<string, string> = { en: 'English', es: 'Español' }

function langLabel(code: string): string {
  return LANG_LABEL[code] ?? code.toUpperCase()
}

type EditableTextProps = {
  courseId: string
  slideId: string
  pageIndex: number
  lang: string
  value: NarrationPerLangStatus
}

function StatusBadge({ status, error }: { status: NarrationPerLangStatus['status']; error?: string }) {
  if (status === 'ready') {
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Ready</span>
  }
  if (status === 'failed') {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800" title={error}>
        Failed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
      <Loader2 className="h-2.5 w-2.5 animate-spin" /> Generating…
    </span>
  )
}

function LangEditor({ courseId, slideId, pageIndex, lang, value }: EditableTextProps) {
  const qc = useQueryClient()
  // null = not being edited locally; render straight from the (possibly still-polling)
  // server value. Set once the admin types, so a poll landing mid-edit can't stomp it.
  const [draftText, setDraftText] = useState<string | null>(null)
  const text = draftText ?? value.text ?? ''
  const dirty = draftText !== null

  const save = useMutation({
    mutationFn: () => editNarrationText(courseId, { slideId, pageIndex, lang, text }),
    onSuccess: (fresh) => {
      qc.setQueryData(['admin-narration-status', courseId], fresh)
      setDraftText(null) // server value now matches what we saved — resume following it
    },
  })

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{langLabel(lang)}</span>
        <StatusBadge status={value.status} error={value.error} />
      </div>
      <textarea
        className="input-pro mt-1 min-h-[64px] w-full resize-y text-sm"
        value={text}
        placeholder={value.text === undefined && value.status === 'pending' ? 'Generating caption…' : ''}
        onChange={(e) => setDraftText(e.target.value)}
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        {value.audioUrl ? (
          <audio
            key={value.audioUrl}
            controls
            preload="none"
            src={resolveMediaUrl(value.audioUrl)}
            className="h-8 max-w-[220px]"
          />
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Volume2 className="h-3 w-3" /> No audio yet
          </span>
        )}
        <Button
          variant="secondary"
          className="!rounded-lg !px-2.5 !py-1 !text-[11px]"
          disabled={!dirty || !text.trim() || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Save & re-narrate'}
        </Button>
      </div>
      {save.isError ? <p className="mt-1 text-[11px] text-red-600">Could not save — try again.</p> : null}
    </div>
  )
}

/**
 * Read/edit view for AI-generated per-page captions + narration audio (EN/ES). Polls
 * its own narrow status endpoint (useAdminNarrationStatus) — never touches the course
 * editor's `draft` state, so it can safely refresh while the admin is mid-edit on other
 * fields (see AdminCoursesPage.tsx save(), which strips `narration` before sending).
 */
export function AdminSlideNarrationPanel({ courseId }: { courseId: string | null }) {
  const qc = useQueryClient()
  const { data, isLoading } = useAdminNarrationStatus(courseId)

  const retry = useMutation({
    mutationFn: () => retryNarration(courseId as string),
    onSuccess: (fresh) => qc.setQueryData(['admin-narration-status', courseId], fresh),
  })

  if (!courseId) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-500">
        Save the course first — AI captions and narration audio generate automatically once your PDF/PPTX
        content finishes uploading.
      </div>
    )
  }

  if (isLoading && !data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        <Spinner size="sm" /> Loading narration status…
      </div>
    )
  }

  if (!data || data.narrationStatus === 'none') {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-500">
        No PDF/PPTX pages to caption yet — add course content above.
      </div>
    )
  }

  const failedCount = data.pages.reduce(
    (n, p) => n + Object.values(p.lang).filter((l) => l.status === 'failed').length,
    0,
  )
  const readyCount = data.pages.reduce(
    (n, p) => n + Object.values(p.lang).filter((l) => l.status === 'ready').length,
    0,
  )
  const totalCount = data.pages.length * data.languages.length

  return (
    <div className="rounded-2xl border-2 border-dashed border-violet-200/90 bg-violet-50/40 p-4">
      {!data.narrationEnabled ? (
        <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          AI narration is not configured on this server (no OPENAI_API_KEY) — pending pages below won&apos;t
          generate automatically. You can still type captions by hand; audio just won&apos;t be created for them.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-violet-900">
            AI captions &amp; narration ({langsLabel(data.languages)})
          </label>
          <p className="mt-1 text-[11px] text-slate-600">
            {data.narrationStatus === 'ready'
              ? `All ${totalCount} caption${totalCount === 1 ? '' : 's'}/audio clips ready.`
              : `${readyCount}/${totalCount} ready — generation runs in the background, even if you close this dialog.`}
          </p>
        </div>
        {failedCount > 0 ? (
          <Button
            variant="secondary"
            className="!rounded-lg !py-1.5 !text-xs"
            disabled={retry.isPending || !data.narrationEnabled}
            onClick={() => retry.mutate()}
          >
            <RefreshCw className={`mr-1 inline h-3.5 w-3.5 ${retry.isPending ? 'animate-spin' : ''}`} />
            Retry {failedCount} failed
          </Button>
        ) : null}
      </div>

      <ul className="mt-3 space-y-3">
        {data.pages.map((page) => (
          <li
            key={`${page.slideId}-${page.pageIndex}`}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row"
          >
            <img
              src={resolveMediaUrl(page.thumbnailUrl)}
              alt=""
              className="h-24 w-20 shrink-0 self-start rounded-lg object-cover ring-1 ring-slate-200"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
              {data.languages.map((lang) => (
                <LangEditor
                  key={lang}
                  courseId={courseId}
                  slideId={page.slideId}
                  pageIndex={page.pageIndex}
                  lang={lang}
                  value={page.lang[lang] ?? { status: 'pending' }}
                />
              ))}
            </div>
            {page.titleOnly ? (
              <span className="self-start rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 sm:self-center">
                Title-only page
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function langsLabel(codes: string[]): string {
  return codes.map(langLabel).join(' / ')
}
