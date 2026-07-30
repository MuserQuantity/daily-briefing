'use client'

import { useEffect, useState } from 'react'

function format(now: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getUTCFullYear()}-${p(now.getUTCMonth() + 1)}-${p(
    now.getUTCDate(),
  )} ${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())}`
}

export function UtcClock({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)

  useEffect(() => {
    const tick = () => setValue(format(new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
      <span
        className="size-1.5 rounded-full bg-success"
        aria-hidden="true"
      />
      <span className="hidden sm:inline">UTC</span>
      <time suppressHydrationWarning dateTime={value}>
        {value}
      </time>
    </span>
  )
}
