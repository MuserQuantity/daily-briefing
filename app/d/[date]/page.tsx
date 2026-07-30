import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DailyView } from '@/components/daily-view'
import { extractToc } from '@/components/markdown-renderer'
import { SiteShell } from '@/components/site-shell'
import {
  formatFullDate,
  getAllMeta,
  getDailyByDate,
  nowStamp,
  today as currentDate,
} from '@/lib/daily'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ date: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { date } = await params
  const daily = getDailyByDate(date)
  // 站点标题后缀由 layout 的 metadata.title.template 统一补上
  if (!daily) return { title: '未找到日报' }
  return {
    title: `${daily.title}（${daily.date}）`,
    description: daily.summary ?? formatFullDate(daily.date),
  }
}

export default async function DailyPage({ params }: Params) {
  const { date } = await params
  const daily = getDailyByDate(date)
  if (!daily) notFound()

  const items = getAllMeta()
  const now = new Date()
  const today = currentDate(now)

  return (
    <SiteShell
      items={items}
      activeDate={daily.date}
      today={today}
      clockInitial={nowStamp(now)}
      toc={extractToc(daily.content)}
    >
      <DailyView daily={daily} today={today} isToday={daily.date === today} />
    </SiteShell>
  )
}
