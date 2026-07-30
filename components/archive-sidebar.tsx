import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import {
  formatDayShort,
  formatMonth,
  groupByMonth,
  type DailyMeta,
} from '@/lib/daily'
import { cn } from '@/lib/utils'

export function ArchiveSidebar({
  items,
  activeDate,
  today,
}: {
  items: DailyMeta[]
  activeDate: string
  today: string
}) {
  const groups = groupByMonth(items)

  return (
    <nav aria-label="日报归档" className="flex flex-col gap-6">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-[13px] text-foreground transition-colors hover:border-border-strong hover:bg-accent"
      >
        <CalendarDays
          className="size-3.5 text-muted-foreground"
          aria-hidden="true"
        />
        今日日报
      </Link>

      {groups.map(({ month, list }) => (
        <section key={month} className="flex flex-col gap-2">
          <h3 className="eyebrow px-3 text-muted-foreground">
            {formatMonth(month)}
          </h3>
          <ul className="flex flex-col">
            {list.map((item) => {
              const active = item.date === activeDate
              return (
                <li key={item.date}>
                  <Link
                    href={`/d/${item.date}`}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-baseline gap-2.5 rounded-md px-3 py-1.5 transition-colors',
                      active ? 'bg-accent' : 'hover:bg-accent/60',
                    )}
                  >
                    <span
                      className={cn(
                        'shrink-0 font-mono text-[11px] tabular-nums',
                        active ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {formatDayShort(item.date)}
                    </span>
                    <span
                      className={cn(
                        'line-clamp-2 text-[13px] leading-snug',
                        active
                          ? 'font-medium text-foreground'
                          : 'text-foreground/70 group-hover:text-foreground',
                      )}
                    >
                      {item.title}
                    </span>
                    {item.date === today ? (
                      <span className="ml-auto shrink-0 self-center rounded-sm border border-border-strong px-1 font-mono text-[10px] uppercase text-muted-foreground">
                        new
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </nav>
  )
}

export function ArchiveStrip({
  items,
  activeDate,
}: {
  items: DailyMeta[]
  activeDate: string
}) {
  return (
    <nav
      aria-label="日报归档（横向）"
      className="scroll-thin -mx-4 overflow-x-auto border-b border-border px-4 pb-3 lg:hidden"
    >
      <ul className="flex w-max gap-1.5">
        {items.map((item) => {
          const active = item.date === activeDate
          return (
            <li key={item.date}>
              <Link
                href={`/d/${item.date}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block rounded border px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors',
                  active
                    ? 'border-primary/40 bg-primary/[0.06] text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {item.date.slice(5)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
