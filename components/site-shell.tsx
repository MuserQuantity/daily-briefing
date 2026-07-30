import type { ReactNode } from 'react'
import { ArchiveSidebar, ArchiveStrip } from '@/components/archive-sidebar'
import { SiteHeader } from '@/components/site-header'
import { Toc } from '@/components/toc'
import type { TocItem } from '@/components/markdown-renderer'
import type { DailyMeta } from '@/lib/daily'

export function SiteShell({
  items,
  activeDate,
  today,
  clockInitial,
  toc = [],
  children,
}: {
  items: DailyMeta[]
  activeDate: string
  today: string
  clockInitial: string
  toc?: TocItem[]
  children: ReactNode
}) {
  // items 按日期倒序，首尾即归档区间
  const latest = items[0]?.date
  const earliest = items[items.length - 1]?.date

  return (
    <div className="min-h-dvh">
      <SiteHeader clockInitial={clockInitial} total={items.length} />

      <div className="mx-auto flex max-w-[1600px] px-4 sm:px-6">
        {/* 左：归档导航 */}
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 border-r border-border py-8 pr-6 lg:block xl:w-64">
          <div className="scroll-thin h-full overflow-y-auto pr-1">
            <ArchiveSidebar
              items={items}
              activeDate={activeDate}
              today={today}
            />
          </div>
        </aside>

        {/* 中：正文 */}
        <main className="min-w-0 flex-1 py-6 lg:px-10 lg:py-10">
          <div className="lg:hidden">
            <ArchiveStrip items={items} activeDate={activeDate} />
          </div>
          {/*
            正文列是流动的，不在这里统一限宽。
            行长由子元素各自的 .measure / .measure-title 控制，
            表格、指标卡等数据区块则铺满整列。
          */}
          <div className="mt-6 min-w-0 lg:mt-0">{children}</div>
        </main>

        {/* 右：本页目录 */}
        {toc.length >= 2 ? (
          <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 py-10 xl:block">
            <div className="scroll-thin h-full overflow-y-auto">
              <Toc items={toc} />
            </div>
          </aside>
        ) : null}
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-8 sm:flex-row sm:items-baseline sm:justify-between sm:px-6">
          <p className="eyebrow text-muted-foreground">
            AI 日报 · Daily Briefing
          </p>
          <p className="font-mono text-[12px] tabular-nums text-muted-foreground">
            每日 UTC+8 更新
            {earliest ? ` · 归档 ${earliest} — ${latest}` : ''}
          </p>
        </div>
      </footer>
    </div>
  )
}
