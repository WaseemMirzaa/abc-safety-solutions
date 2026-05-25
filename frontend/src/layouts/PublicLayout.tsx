import { motion, useReducedMotion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { NotificationPermissionBanner } from '@/components/NotificationPermissionBanner'
import { easeOut } from '@/lib/motionPresets'

export function PublicLayout() {
  const location = useLocation()
  const reduce = useReducedMotion()

  return (
    <div className="flex min-h-svh flex-col bg-gradient-to-b from-white via-slate-50/90 to-slate-100/80">
      <SiteHeader />
      <NotificationPermissionBanner />
      <main className="flex-1">
        <motion.div
          key={location.pathname}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.28, ease: easeOut }}
          className="min-h-[1px]"
        >
          <Outlet />
        </motion.div>
      </main>
      <SiteFooter />
    </div>
  )
}
