import { DailyView } from '@/components/daily-view'
import { extractToc } from '@/components/markdown-renderer'
import { SiteShell } from '@/components/site-shell'
import { getAllMeta, nowStamp, resolveCurrentDaily } from '@/lib/daily'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const now = new Date()
  const { daily, isToday, today } = resolveCurrentDaily(now)
  const items = getAllMeta()

  return (
    <SiteShell
      items={items}
      activeDate={daily?.date ?? today}
      today={today}
      clockInitial={nowStamp(now)}
      toc={daily ? extractToc(daily.content) : []}
    >
      {daily ? (
        <DailyView
          daily={daily}
          today={today}
          isToday={isToday}
          fallbackNotice={!isToday}
        />
      ) : (
        <div className="rounded-md border border-border p-8">
          <h1 className="text-2xl font-light text-foreground">暂无日报</h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
            添加一个按年月归档的 Markdown 文件即可，例如{' '}
            <code className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
              content/daily/2026/07/2026-07-30.md
            </code>
            ；也可以通过{' '}
            <code className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
              POST /api/daily
            </code>{' '}
            推送。
          </p>
        </div>
      )}
    </SiteShell>
  )
}
