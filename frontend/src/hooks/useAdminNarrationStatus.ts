import { useQuery } from '@tanstack/react-query'
import { fetchNarrationStatus, type NarrationStatusSummary } from '@/api/localData'

const POLL_MS = 4000

function hasPendingWork(data: NarrationStatusSummary | undefined): boolean {
  if (!data || !data.narrationEnabled) return false // disabled server-side — nothing will ever resolve, stop polling
  return data.pages.some((p) => Object.values(p.lang).some((l) => l.status === 'pending'))
}

/**
 * Polls the lightweight narration-status endpoint while AI caption/audio generation is
 * in flight, stopping once every page+language reaches a terminal state.
 *
 * Deliberately reads into its OWN query cache slice, never into the course-editor
 * `draft` object — merging polled data into `draft.slides` would let a background poll
 * silently overwrite an admin's in-progress edits to title/price/other slides (the
 * editor's `save()` always round-trips its full local `draft`, so anything written into
 * it from outside gets sent right back to the server as if the admin had typed it).
 */
export function useAdminNarrationStatus(courseId: string | null) {
  return useQuery({
    queryKey: ['admin-narration-status', courseId],
    queryFn: () => fetchNarrationStatus(courseId as string),
    enabled: Boolean(courseId),
    refetchOnMount: 'always',
    refetchInterval: (query) => (hasPendingWork(query.state.data) ? POLL_MS : false),
  })
}
