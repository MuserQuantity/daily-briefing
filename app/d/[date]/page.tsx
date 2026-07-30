import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DailyView } from '@/components/daily-view'
import { extractToc } from '@/components/markdown-renderer'
import { SiteShell } from '@/components/site-shell'
import {
  formatFullDate,
  getAllMeta,
  getDailyByDate,
  utcToday,
} from '@/lib/daily'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ date: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { date } = await params
  const daily = getDailyByDate(date)
  if (!daily) return { title: '未找到日报 · AI 日报' }
  return {
    title: `${daily.title} · AI 日报 ${daily.date}`,
    description: daily.summary ?? formatFullDate(daily.date),
  }
}

export default async function DailyPage({ params }: Params) {
  const { date } = await params
  const daily = getDailyByDate(date)
  if (!daily) notFound()

  const items = getAllMeta()
  const now = new Date()
  const today = utcToday(now)

  return (
    <SiteShell
      items={items}
      activeDate={daily.date}
      today={today}
      clockInitial={now.toISOString().slice(0, 19).replace('T', ' ')}
      toc={extractToc(daily.content)}
    >
      <DailyView daily={daily} today={today} isToday={daily.date === today} />
    </SiteShell>
  )
}
