'use client'

import { useEffect, useState } from 'react'

/** 站点时区固定为 UTC+8，用 UTC 取值加固定偏移，避免依赖访客本地时区 */
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000

function format(now: Date) {
  const t = new Date(now.getTime() + TZ_OFFSET_MS)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(
    t.getUTCDate(),
  )} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}`
}

export function SiteClock({ initial }: { initial: string }) {
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
      <span className="hidden sm:inline">UTC+8</span>
      <time suppressHydrationWarning dateTime={`${value.replace(' ', 'T')}+08:00`}>
        {value}
      </time>
    </span>
  )
}
