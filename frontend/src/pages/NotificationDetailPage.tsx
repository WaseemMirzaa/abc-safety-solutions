import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bell } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'
import { fetchNotifications, markNotificationRead } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { t } from '@/i18n/t'

/** WebView-friendly: `/notifications/:id` */
export function NotificationDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: list = [], isLoading } = useQuery({
    queryKey: qk.notifications,
    queryFn: fetchNotifications,
    enabled: Boolean(user),
  })
  const item = list.find((n) => n.id === id)

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  })

  if (!user) {
    return (
      <Container className="py-20 text-center">
        <Link to="/login" className="font-semibold text-sky-800">
          Sign in
        </Link>
      </Container>
    )
  }

  return (
    <div className="py-10 sm:py-14">
      <Container className="max-w-2xl">
        <Link
          to="/notifications"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('ui_notifications_back', { defaultValue: 'All notifications' })}
        </Link>
        {isLoading ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : !item ? (
          <p className="mt-8 text-sm text-slate-600">
            {t('ui_notifications_not_found', { defaultValue: 'Notification not found.' })}
          </p>
        ) : (
          <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Bell className="h-5 w-5" />
              </div>
              <h1 className="font-display text-xl font-bold text-brand-900">{item.title}</h1>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.body}</p>
            <p className="mt-4 text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
            {!item.read ? (
              <Button
                type="button"
                variant="secondary"
                className="mt-4 !text-xs"
                onClick={() => void markRead.mutate(item.id)}
              >
                {t('ui_notifications_mark_read', { defaultValue: 'Mark as read' })}
              </Button>
            ) : null}
          </article>
        )}
      </Container>
    </div>
  )
}
