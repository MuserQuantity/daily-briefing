import Link from 'next/link'
import { Rss } from 'lucide-react'
import { SiteClock } from '@/components/site-clock'

export function SiteHeader({
  clockInitial,
  total,
}: {
  clockInitial: string
  total: number
}) {
  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md">
      {/* 2px 品牌色条，参考站的标志性顶边 */}
      <div className="brand-bar h-0.5 w-full" aria-hidden="true" />
      <div className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded bg-foreground">
              <Rss className="size-3.5 text-background" aria-hidden="true" />
            </span>
            <span className="text-[15px] font-medium tracking-tight text-foreground">
              AI 日报
            </span>
            <span
              className="hidden h-4 w-px bg-border sm:block"
              aria-hidden="true"
            />
            <span className="eyebrow hidden text-muted-foreground sm:block">
              daily briefing
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">
            <span className="eyebrow hidden tabular-nums text-muted-foreground md:block">
              {total} 期
            </span>
            <SiteClock initial={clockInitial} />
          </div>
        </div>
      </div>
    </header>
  )
}
