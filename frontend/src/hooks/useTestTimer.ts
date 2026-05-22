import { useEffect, useState } from 'react'

export function formatTestTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

/** Countdown for a knowledge check. `timeLimitMinutes` 0 = disabled. */
export function useTestTimer(timeLimitMinutes: number | undefined, active: boolean) {
  const totalSec =
    timeLimitMinutes && timeLimitMinutes > 0 ? Math.round(timeLimitMinutes * 60) : 0
  const [remainingSec, setRemainingSec] = useState(totalSec)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!active || totalSec <= 0) {
      setRemainingSec(totalSec)
      setExpired(false)
      return
    }
    setRemainingSec(totalSec)
    setExpired(false)
    const endsAt = Date.now() + totalSec * 1000
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setRemainingSec(left)
      if (left <= 0) setExpired(true)
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [active, totalSec])

  const progressPct = totalSec > 0 ? (remainingSec / totalSec) * 100 : 100
  const urgent = totalSec > 0 && remainingSec <= Math.min(60, totalSec * 0.15)
  const critical = totalSec > 0 && remainingSec <= Math.min(30, totalSec * 0.08)

  return {
    enabled: totalSec > 0,
    totalSec,
    remainingSec,
    progressPct,
    expired,
    urgent,
    critical,
    label: formatTestTime(remainingSec),
  }
}
