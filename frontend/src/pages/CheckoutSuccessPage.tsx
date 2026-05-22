import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Container } from '@/components/Container'
import { Button } from '@/components/Button'
import { completeStripeCheckout } from '@/api/localData'
import { qk } from '@/api/queryKeys'
import { t } from '@/i18n/t'

export function CheckoutSuccessPage() {
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const sessionId = sp.get('session_id')?.trim() ?? ''
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setErr(t('ui_checkout_success_missing', { defaultValue: 'Missing payment session.' }))
      setBusy(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        await completeStripeCheckout(sessionId)
        if (cancelled) return
        await qc.invalidateQueries({ queryKey: qk.enrollments })
        await qc.invalidateQueries({ queryKey: qk.myOrders })
        navigate('/my-courses', { replace: true })
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : t('ui_checkout_err'))
          setBusy(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId, navigate, qc])

  return (
    <div className="py-16 sm:py-24">
      <Container className="max-w-lg text-center">
        <h1 className="font-display text-2xl font-bold text-brand-900">
          {t('ui_checkout_success_title', { defaultValue: 'Payment received' })}
        </h1>
        {busy ? (
          <p className="mt-4 text-sm text-slate-600">
            {t('ui_checkout_success_busy', { defaultValue: 'Activating your course access…' })}
          </p>
        ) : err ? (
          <>
            <p className="mt-4 text-sm text-red-600">{err}</p>
            <Link to="/my-courses" className="mt-6 inline-block">
              <Button variant="secondary">{t('ui_learn_back_my_courses')}</Button>
            </Link>
          </>
        ) : null}
      </Container>
    </div>
  )
}
