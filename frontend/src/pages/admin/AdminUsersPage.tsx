import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { AdminModal } from '@/components/admin/AdminModal'
import { fetchAdminDirectory } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { localCache } from '@/lib/localCache'
import type { AdminDirectoryUser } from '@/types'
import { t } from '@/i18n/t'

export function AdminUsersPage() {
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useQuery({ queryKey: qk.adminDirectory, queryFn: fetchAdminDirectory })
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<AdminDirectoryUser['role']>('learner')
  const [err, setErr] = useState('')

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.adminDirectory })

  const add = () => {
    setErr('')
    const e = email.trim().toLowerCase()
    if (!e || !name.trim()) {
      setErr('Email and name are required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setErr('Enter a valid email.')
      return
    }
    if (localCache.getAdminDirectory().some((u) => u.email.toLowerCase() === e)) {
      setErr('This email is already in the directory.')
      return
    }
    localCache.addAdminDirectoryUser({ email: e, name: name.trim(), role })
    setEmail('')
    setName('')
    setRole('learner')
    setOpen(false)
    invalidate()
  }

  const remove = (u: AdminDirectoryUser) => {
    if (window.confirm(`Remove ${u.email} from directory?`)) {
      localCache.removeAdminDirectoryUser(u.email)
      invalidate()
    }
  }

  const isBuiltin = (email: string) => ['learner@demo.local', 'admin@demo.local'].includes(email.toLowerCase())

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-brand-900">{t('AdminUsersPage_62_users_b96cb62200')}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Demo directory for support workflows; real users will sync from the API.
            </p>
          </div>
        </div>
        <Button type="button" className="gap-2 self-start" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add user
        </Button>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-4 py-3">{t('AdminUsersPage_78_name_c388acf2a2')}</th>
              <th className="px-4 py-3">{t('AdminUsersPage_79_email_7a9442b0f2')}</th>
              <th className="px-4 py-3">{t('AdminUsersPage_80_role_4bae14016e')}</th>
              <th className="px-4 py-3">{t('AdminUsersPage_81_source_18c56e7cfc')}</th>
              <th className="px-4 py-3 text-right">{t('AdminUsersPage_82_action_e2dbf7f5ad')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.email} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-brand-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{u.role}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {isBuiltin(u.email) ? t('ui_users_builtin') : t('ui_users_added_local')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isBuiltin(u.email) ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        className="!rounded-lg !border-red-200 !py-1.5 !text-xs !text-red-800"
                        onClick={() => remove(u)}
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

      {open ? (
        <AdminModal title="Add directory user" onClose={() => setOpen(false)}>
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('AdminUsersPage_132_role_789b86a640')}</label>
              <select className="input-pro mt-1.5 w-full" value={role} onChange={(e) => setRole(e.target.value as AdminDirectoryUser['role'])}>
                <option value="learner">{t('AdminUsersPage_134_learner_a74ff939e6')}</option>
                <option value="admin">{t('AdminUsersPage_135_admin_f20661fe44')}</option>
              </select>
            </div>
            {err ? <p className="text-sm font-medium text-red-600">{err}</p> : null}
          </div>
          <div className="mt-8 flex gap-3">
            <Button type="button" onClick={add}>
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
