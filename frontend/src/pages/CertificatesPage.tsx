import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CertificateVisual, SAMPLE_CERTIFICATE } from '@/components/CertificateVisual'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'
import { localCache } from '@/lib/localCache'
import { listContainer, listItem } from '@/lib/motionPresets'
import { Award, Printer } from 'lucide-react'

export function CertificatesPage() {
  const { user } = useAuth()
  const certs = localCache.getCertificates()

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20">
        <Container className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/25">
            <Award className="h-8 w-8" />
          </div>
          <h1 className="mt-8 font-display text-3xl font-bold text-brand-900">Certificates</h1>
          <p className="mt-3 text-slate-600">Sign in to view credentials earned on this device.</p>
          <Link to="/login" className="mt-10 inline-block">
            <Button>Sign in</Button>
          </Link>
        </Container>
      </div>
    )
  }

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-900/20">
            <Award className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">Certificates</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
              PDF email delivery will connect to NestJS. Records below are from local cache.
            </p>
          </div>
        </div>

        {certs.length === 0 ? (
          <div className="mt-14 space-y-10">
            <div className="min-w-0 rounded-3xl border border-slate-200/90 bg-white/80 p-4 shadow-sm sm:p-8 md:p-10">
              <p className="text-center font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-800 sm:text-xs">
                Design preview
              </p>
              <CertificateVisual cert={SAMPLE_CERTIFICATE} sampleWatermark className="mx-auto mt-4 max-w-full sm:mt-6 md:max-w-3xl" />
              <p className="mt-6 text-center text-sm text-slate-500">
                Sample layout only. Pass a course knowledge check to earn a certificate with your name.
              </p>
            </div>
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-8 py-12 text-center text-slate-600">
              <p className="font-medium text-brand-900">No certificates on this device yet.</p>
              <Link to="/my-courses" className="mt-6 inline-block">
                <Button>Go to my learning</Button>
              </Link>
            </div>
          </div>
        ) : (
          <motion.ul
            className="mt-12 space-y-12"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {certs.map((c) => (
              <motion.li key={c.id} variants={listItem} layout className="certificate-print-root min-w-0 space-y-5">
                <CertificateVisual cert={c} className="mx-auto w-full max-w-3xl" />
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 print:hidden">
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2 px-3 text-xs sm:px-4 sm:text-sm"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4 shrink-0" />
                    Print / save PDF
                  </Button>
                  <Button variant="secondary" className="text-xs sm:text-sm" disabled title="PDF via API later">
                    Email PDF (soon)
                  </Button>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </Container>
    </div>
  )
}
