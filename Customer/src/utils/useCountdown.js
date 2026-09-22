import { useEffect, useState } from 'react'

// Ticks once a second toward `deadline` (epoch ms). Returns mm:ss plus a done flag.
//
// State holds the current time rather than the remaining time, so the remaining value is
// derived — that keeps the effect to scheduling alone and avoids a setState in the branch
// where there is no deadline at all.
//
// The interval is cleared on unmount and whenever the deadline changes, so StrictMode's
// double-mount cannot leave two timers running at twice the speed.
export function useCountdown(deadline) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!deadline) return undefined

    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [deadline])

  const remaining = deadline ? Math.max(0, deadline - now) : 0
  const done = Boolean(deadline) && remaining <= 0

  const totalSeconds = Math.floor(remaining / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return { label: `${minutes}:${seconds}`, done, active: Boolean(deadline) && !done }
}
