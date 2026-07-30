import Link from 'next/link'
import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { formatFullDate, getNeighbors, type Daily } from '@/lib/daily'

export function DailyView({
  daily,
  today,
  isToday,
  /** 仅首页在「当日未发布、回退到最新一期」时传 true */
  fallbackNotice = false,
}: {
  daily: Daily
  today: string
  isToday: boolean
  fallbackNotice?: boolean
}) {
  const { newer, older } = getNeighbors(daily.date)

  return (
    <article className="min-w-0">
      {fallbackNotice ? (
        <div className="mb-8 flex items-start gap-3 rounded-md border border-info-line bg-info-surface px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
          <p className="text-[0.925rem] leading-relaxed text-foreground/85">
            <span className="font-semibold text-foreground">
              今日（UTC {today}）尚未发布。
            </span>{' '}
            以下为站内最新一期，发布后本页会自动切换。
          </p>
        </div>
      ) : null}

      <header>
        <p className="eyebrow text-muted-foreground">
          {isToday ? '今日日报' : '往期日报'}
          {daily.issue ? ` · 第 ${daily.issue} 期` : ''}
        </p>

        <h1 className="mt-3 text-balance text-[2.1rem] font-light leading-[1.2] tracking-[0.01em] text-foreground sm:text-[2.5rem]">
          {daily.title}
        </h1>

        {daily.summary ? (
          <p className="mt-4 max-w-[42rem] text-pretty text-[1.0625rem] leading-[1.7] text-muted-foreground">
            {daily.summary}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted-foreground">
          <time dateTime={daily.date} className="tabular-nums">
            {formatFullDate(daily.date)}
          </time>
          <span className="h-3 w-px bg-border" aria-hidden="true" />
          <span>约 {daily.readingMinutes} 分钟</span>
          {daily.editor ? (
            <>
              <span className="h-3 w-px bg-border" aria-hidden="true" />
              <span>{daily.editor}</span>
            </>
          ) : null}
        </div>

        {daily.tags.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {daily.tags.map((tag) => (
              <li
                key={tag}
                className="rounded border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {daily.highlights.length ? (
        <section
          aria-labelledby="highlights-title"
          className="mt-8 overflow-hidden rounded-md border border-border"
        >
          <h2
            id="highlights-title"
            className="eyebrow border-b border-border bg-card px-4 py-2.5 text-muted-foreground"
          >
            要点速览
          </h2>
          <ol className="divide-y divide-border">
            {daily.highlights.map((h, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <span className="mt-px shrink-0 font-mono text-xs tabular-nums text-primary">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-pretty text-[0.95rem] leading-relaxed text-foreground/85">
                  {h}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="mt-2">
        <MarkdownRenderer content={daily.content} />
      </div>

      <nav
        aria-label="期数导航"
        className="mt-14 grid gap-3 border-t border-border pt-8 sm:grid-cols-2"
      >
        {older ? (
          <Link
            href={`/d/${older.date}`}
            className="group flex flex-col gap-1.5 rounded-md border border-border p-4 transition-colors hover:border-border-strong hover:bg-accent/60"
          >
            <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              上一期 · {older.date}
            </span>
            <span className="line-clamp-2 text-[0.925rem] text-foreground/85 group-hover:text-foreground">
              {older.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link
            href={`/d/${newer.date}`}
            className="group flex flex-col items-end gap-1.5 rounded-md border border-border p-4 text-right transition-colors hover:border-border-strong hover:bg-accent/60 sm:col-start-2"
          >
            <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              下一期 · {newer.date}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
            <span className="line-clamp-2 text-[0.925rem] text-foreground/85 group-hover:text-foreground">
              {newer.title}
            </span>
          </Link>
        ) : null}
      </nav>
    </article>
  )
}
