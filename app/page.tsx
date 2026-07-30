import { DailyView } from '@/components/daily-view'
import { extractToc } from '@/components/markdown-renderer'
import { SiteShell } from '@/components/site-shell'
import { getAllMeta, resolveCurrentDaily } from '@/lib/daily'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const now = new Date()
  const { daily, isToday, today } = resolveCurrentDaily(now)
  const items = getAllMeta()
  const clockInitial = now.toISOString().slice(0, 19).replace('T', ' ')

  return (
    <SiteShell
      items={items}
      activeDate={daily?.date ?? today}
      today={today}
      clockInitial={clockInitial}
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
            请在{' '}
            <code className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
              content/daily/
            </code>{' '}
            目录下添加以日期命名的 Markdown 文件，例如{' '}
            <code className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
              2026-07-30.md
            </code>
            。
          </p>
        </div>
      )}
    </SiteShell>
  )
}
