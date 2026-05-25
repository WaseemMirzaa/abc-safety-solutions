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
  const courseGroups = useMemo(() => {
    const map = new Map<string, {
      courseId: string
      courseTitle: string
      enrollments: AdminUserDetail['enrollments']
      certificate: AdminUserDetail['certificates'][0] | null
    }>()
    for (const e of detail.enrollments) {
      if (!map.has(e.courseId)) {
        map.set(e.courseId, { courseId: e.courseId, courseTitle: e.courseTitle, enrollments: [], certificate: null })
      }
      map.get(e.courseId)!.enrollments.push(e)
    }
    for (const c of detail.certificates) {
      if (c.courseId && map.has(c.courseId)) {
        map.get(c.courseId)!.certificate = c
      }
    }
    for (const g of map.values()) {
      g.enrollments.sort((a, b) => new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime())
    }
    return [...map.values()]
  }, [detail])

  const attemptsByEnrollment = useMemo(() => {
    const map = new Map<string, AdminUserDetail['testAttempts']>()
    for (const a of detail.testAttempts) {
      if (!map.has(a.enrollmentId)) map.set(a.enrollmentId, [])
      map.get(a.enrollmentId)!.push(a)
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    }
    return map
  }, [detail.testAttempts])

  const enrolledCourseIds = useMemo(
    () => new Set(detail.enrollments.map((e) => e.courseId)),
    [detail.enrollments],
  )
  const standaloneCerts = detail.certificates.filter((c) => !c.courseId || !enrolledCourseIds.has(c.courseId))
  const now = new Date()

  return (
    <AdminModal title={`${detail.user.name} — details`} wide onClose={onClose}>
      <p className="text-sm text-slate-600">{detail.user.email}</p>

      {courseGroups.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No course activity.</p>
      ) : (
        <div className="mt-6 space-y-5">
          {courseGroups.map((group) => {
            const cert = group.certificate
            const certExpired = cert?.expiresAt ? new Date(cert.expiresAt) <= now : false
            const certStatus = cert ? (certExpired ? 'Expired' : 'Active') : null
            return (
              <div key={group.courseId} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-brand-900">{group.courseTitle}</h3>
                  {cert ? (
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${certStatus === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                        {certStatus}
                      </span>
                      <a href={`/certificates/${cert.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-sky-700 hover:underline">
                        View Certificate
                      </a>
                    </div>
                  ) : null}
                </div>

                {cert ? (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 border-b border-slate-100 bg-emerald-50/50 px-4 py-2 text-xs text-slate-600 sm:grid-cols-4">
                    <div><span className="font-medium text-slate-500">Cert # </span>{cert.certificateNumber}</div>
                    <div><span className="font-medium text-slate-500">Issued </span>{new Date(cert.issuedAt).toLocaleDateString()}</div>
                    <div><span className="font-medium text-slate-500">Expires </span>{cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : '—'}</div>
                    <div><span className="font-medium text-slate-500">Source </span>{cert.source}</div>
                  </div>
                ) : null}

                <div className="divide-y divide-slate-100">
                  {group.enrollments.map((enr, ei) => {
                    const attempts = attemptsByEnrollment.get(enr.id) ?? []
                    return (
                      <div key={enr.id} className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="text-xs font-semibold text-violet-800">Purchase #{ei + 1}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(enr.purchasedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          {enr.refunded ? (
                            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">Refunded</span>
                          ) : null}
                          {enr.attemptsExhausted ? (
                            <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">Attempts Exhausted</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">{enr.testAttemptsRemaining} attempt{enr.testAttemptsRemaining !== 1 ? 's' : ''} remaining</span>
                          )}
                        </div>
                        {attempts.length > 0 ? (
                          <table className="mt-2 min-w-full text-left text-xs">
                            <thead>
                              <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                                <th className="pb-1 pr-4">Attempt</th>
                                <th className="pb-1 pr-4">Score</th>
                                <th className="pb-1 pr-4">Required</th>
                                <th className="pb-1 pr-4">Result</th>
                                <th className="pb-1">Date &amp; Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attempts.map((a) => (
                                <tr key={a.id} className="border-t border-slate-100">
                                  <td className="py-1 pr-4">#{a.attemptNumber}</td>
                                  <td className="py-1 pr-4">{a.scorePercent}%</td>
                                  <td className="py-1 pr-4">{a.passPercent}%</td>
                                  <td className="py-1 pr-4">
                                    <span className={`font-semibold ${a.passed ? 'text-emerald-700' : 'text-red-600'}`}>
                                      {a.timedOut ? 'Timed out' : a.passed ? 'Pass' : 'Fail'}
                                    </span>
                                  </td>
                                  <td className="py-1 text-slate-500">
                                    {new Date(a.submittedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="mt-1 text-[11px] text-slate-400">No test attempts for this purchase.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {standaloneCerts.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Other Certificates</h3>
          <ul className="mt-2 space-y-2">
            {standaloneCerts.map((c) => {
              const expired = c.expiresAt ? new Date(c.expiresAt) <= now : false
              return (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-brand-900">{c.courseName}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      #{c.certificateNumber} · Issued {new Date(c.issuedAt).toLocaleDateString()}
                      {c.expiresAt ? ` · Expires ${new Date(c.expiresAt).toLocaleDateString()}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${expired ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                      {expired ? 'Expired' : 'Active'}
                    </span>
                    <a href={`/certificates/${c.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-sky-700 hover:underline">
                      View
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </AdminModal>
  )
}
