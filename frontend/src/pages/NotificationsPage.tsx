import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { t } from '@/i18n/t'

export function NotificationsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: list = [], isLoading } = useQuery({
    queryKey: qk.notifications,
    queryFn: fetchNotifications,
    enabled: Boolean(user),
  })

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  })

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  })

  if (!user) {
    return (
      <Container className="py-20 text-center">
        <p className="text-slate-600">{t('ui_notifications_sign_in', { defaultValue: 'Sign in to view notifications.' })}</p>
        <Link to="/login" className="mt-4 inline-block font-semibold text-sky-800">
          Sign in
        </Link>
      </Container>
    )
  }

  return (
    <div className="py-10 sm:py-14">
      <Container className="max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Bell className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-bold text-brand-900 sm:text-3xl">
              {t('ui_notifications_title', { defaultValue: 'Notifications' })}
            </h1>
          </div>
          {list.some((n) => !n.read) ? (
            <Button
              type="button"
              variant="secondary"
              className="!text-xs"
              onClick={() => void markAll.mutate()}
            >
              {t('ui_notifications_mark_all', { defaultValue: 'Mark all read' })}
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : list.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600">
            {t('ui_notifications_empty', { defaultValue: 'No notifications yet.' })}
          </p>
        ) : (
          <ul className="mt-8 space-y-3">
            {list.map((n) => (
              <li
                key={n.id}
                className={`rounded-2xl border px-4 py-4 shadow-sm transition ${
                  n.read ? 'border-slate-200 bg-white' : 'border-sky-200 bg-sky-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/notifications/${encodeURIComponent(n.id)}`} className="block hover:text-sky-900">
                      <p className="font-semibold text-brand-900">{n.title}</p>
                    </Link>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{n.body}</p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.read ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="!shrink-0 !px-2 !py-1 !text-[10px]"
                      onClick={() => void markRead.mutate(n.id)}
                    >
                      Read
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  )
}
