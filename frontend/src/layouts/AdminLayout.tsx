import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  ShoppingBag,
  Tags,
  Users,
} from 'lucide-react'
import { easeOut } from '@/lib/motionPresets'

const side = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen, end: false },
  { to: '/admin/categories', label: 'Categories', icon: Tags, end: false },
  { to: '/admin/tests', label: 'Tests', icon: ClipboardList, end: false },
  { to: '/admin/media', label: 'Media', icon: ImageIcon, end: false },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, end: false },
  { to: '/admin/announcements', label: 'Announce', icon: Megaphone, end: false },
] as const

export function AdminLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const reduce = useReducedMotion()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-svh bg-slate-50 lg:flex">
      <aside className="relative overflow-hidden border-b border-slate-200/90 bg-white text-brand-900 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:border-slate-200/90">
        <div
          className="pointer-events-none absolute inset-0 hidden opacity-90 lg:block"
          style={{
            backgroundImage:
              'radial-gradient(circle at 0% 0%, rgba(56,189,248,0.1), transparent 55%), radial-gradient(circle at 100% 100%, rgba(245,158,11,0.06), transparent 45%)',
          }}
        />
        <div className="relative flex items-center justify-between gap-2 p-5 lg:flex-col lg:items-stretch">
          <p className="font-display text-sm font-bold tracking-tight text-brand-900">Admin</p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-sky-800 lg:mt-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Exit to site
          </Link>
        </div>
        <nav className="relative flex max-h-[55vh] gap-1 overflow-x-auto overflow-y-auto px-3 pb-4 lg:max-h-none lg:flex-col lg:px-3">
          {side.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-semibold whitespace-nowrap transition',
                  isActive
                    ? 'bg-sky-600/10 text-sky-900 shadow-inner shadow-sky-900/5 ring-1 ring-sky-600/15'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-brand-900',
                )
              }
            >
              <s.icon className="h-4 w-4 shrink-0 opacity-90" />
              {s.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-8 lg:p-12">
        {/* No AnimatePresence mode="wait" here — avoids blank Outlet under React StrictMode */}
        <motion.div
          key={location.pathname}
          initial={reduce ? false : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduce ? 0 : 0.24, ease: easeOut }}
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  )
}
