import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { AdminModal } from '@/components/admin/AdminModal'
import {
  adminCreateDirectoryUser,
  adminRemoveDirectoryUser,
  fetchAdminUserDetail,
  fetchAdminUsersInsights,
} from '@/api/localData'
import { qk } from '@/api/queryKeys'
import type { AdminDirectoryUser, AdminUserDetail } from '@/types'
import { t } from '@/i18n/t'

export function AdminUsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [certFilter, setCertFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const queryKey = useMemo(
    () => [...qk.adminDirectory, search, certFilter] as const,
    [search, certFilter],
  )
  const { data: users = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchAdminUsersInsights(search, certFilter),
  })
  const { data: detail } = useQuery({
    queryKey: qk.adminUserDetail(selectedId ?? ''),
    queryFn: () => fetchAdminUserDetail(selectedId!),
    enabled: Boolean(selectedId),
  })
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.adminDirectory })

  const add = async () => {
    setErr('')
    const e = email.trim().toLowerCase()
    if (!e || !name.trim()) {
      setErr('Email and name are required.')
      return
    }
    if (password.trim().length < 8) {
      setErr('Password must be at least 8 characters.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setErr('Enter a valid email.')
      return
    }
    if (users.some((u) => u.email.toLowerCase() === e)) {
      setErr('This email is already in the directory.')
      return
    }
    try {
      await adminCreateDirectoryUser({ email: e, name: name.trim(), role: 'learner', password: password.trim() })
      setEmail('')
      setName('')
      setPassword('')
      setOpen(false)
      invalidate()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not create user.')
    }
  }

  const remove = async (u: AdminDirectoryUser) => {
    if (isProtectedAdmin(u)) return
    if (window.confirm(`Remove ${u.email} from the directory?`)) {
      await adminRemoveDirectoryUser(u.email)
      invalidate()
    }
  }

  const isProtectedAdmin = (u: AdminDirectoryUser) => u.role === 'admin' || Boolean(u.protected)

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-900">{t('AdminUsersPage_62_users_b96cb62200')}</h1>
            <p className="mt-1 text-sm text-slate-600">{t('ui_admin_users_intro')}</p>
          </div>
        </div>
        <Button type="button" className="gap-2 self-start" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add user
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          className="input-pro w-full sm:max-w-xs"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className="input-pro w-full sm:max-w-xs"
          placeholder="Filter by certificate course name"
          value={certFilter}
          onChange={(e) => setCertFilter(e.target.value)}
        />
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-4 py-3">{t('AdminUsersPage_78_name_c388acf2a2')}</th>
              <th className="px-4 py-3">{t('AdminUsersPage_79_email_7a9442b0f2')}</th>
              <th className="px-4 py-3">{t('AdminUsersPage_80_role_4bae14016e')}</th>
              <th className="px-4 py-3">Test fails</th>
              <th className="px-4 py-3">Certs</th>
              <th className="px-4 py-3">{t('AdminUsersPage_81_source_18c56e7cfc')}</th>
              <th className="px-4 py-3 text-right">{t('AdminUsersPage_82_action_e2dbf7f5ad')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.email}
                  className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/80 ${
                    selectedId === u.id ? 'bg-sky-50/60' : ''
                  }`}
                  onClick={() => u.id && setSelectedId(u.id)}
                >
                  <td className="px-4 py-3 font-medium text-brand-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{u.role}</td>
                  <td className="px-4 py-3 text-slate-600">{u.testFailCount ?? 0}</td>
                  <td className="px-4 py-3 text-slate-600">{u.certificateCount ?? 0}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {isProtectedAdmin(u) ? t('ui_users_protected_admin') : t('ui_users_added_local')}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {isProtectedAdmin(u) ? (
                      <span className="text-xs text-slate-400" title={t('ui_users_protected_admin_hint')}>
                        —
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        className="!rounded-lg !border-red-200 !py-1.5 !text-xs !text-red-800"
                        onClick={() => void remove(u)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedId && detail ? (
        <UserDetailPanel detail={detail} onClose={() => setSelectedId(null)} />
      ) : null}

      {open ? (
        <AdminModal title={t('ui_admin_users_add_title')} onClose={() => setOpen(false)}>
          <p className="mb-4 text-xs text-slate-600">{t('ui_admin_users_add_hint')}</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminUsersPage_124_email_8755edb8b6')}</label>
              <input className="input-pro mt-1.5 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminUsersPage_128_display_name_64fcf60148')}</label>
              <input className="input-pro mt-1.5 w-full" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Initial password</label>
              <input
                className="input-pro mt-1.5 w-full"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            {err ? <p className="text-sm font-medium text-red-600">{err}</p> : null}
          </div>
          <div className="mt-8 flex gap-3">
            <Button type="button" onClick={() => void add()}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  )
}

function UserDetailPanel({ detail, onClose }: { detail: AdminUserDetail; onClose: () => void }) {
  return (
    <AdminModal title={`${detail.user.name} — details`} wide onClose={onClose}>
      <p className="text-sm text-slate-600">{detail.user.email}</p>
      <p className="mt-2 text-sm font-medium text-brand-900">
        Test failures: {detail.testFailCount}
      </p>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Orders</h3>
      <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">Attempts left</th>
            </tr>
          </thead>
          <tbody>
            {detail.enrollments.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{e.courseTitle}</td>
                <td className="px-3 py-2 font-mono text-[10px]">{e.orderId.slice(0, 20)}…</td>
                <td className="px-3 py-2">{new Date(e.purchasedAt).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  {e.attemptsExhausted ? 'Exhausted' : e.testAttemptsRemaining}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Test attempts</h3>
      <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Pass %</th>
              <th className="px-3 py-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {detail.testAttempts.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{a.courseTitle}</td>
                <td className="px-3 py-2">{a.attemptNumber}</td>
                <td className="px-3 py-2">{a.scorePercent}%</td>
                <td className="px-3 py-2">{a.passPercent}%</td>
                <td className="px-3 py-2">{a.passed ? 'Pass' : 'Fail'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Certificates</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {detail.certificates.map((c) => (
          <li key={c.id} className="rounded-lg border border-slate-200 px-3 py-2">
            {c.courseName} · #{c.certificateNumber} · {c.source}
          </li>
        ))}
      </ul>
    </AdminModal>
  )
}
