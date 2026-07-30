import fs from 'node:fs'
import path from 'node:path'
import { cache } from 'react'
import matter from 'gray-matter'

/** 站点时区固定为 UTC+8（中国自 1991 年起无夏令时，偏移恒定） */
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000

export type DailyMeta = {
  /** YYYY-MM-DD (UTC+8) */
  date: string
  title: string
  issue?: number
  summary?: string
  tags: string[]
  highlights: string[]
  editor?: string
}

export type Daily = DailyMeta & {
  content: string
  wordCount: number
  readingMinutes: number
}

export const CONTENT_DIR = path.join(process.cwd(), 'content', 'daily')

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * 严格校验日历日期：格式对 **且** 真实存在。
 * 单靠正则会放过 2026-02-30，这里用往返比对把它挡掉。
 */
export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}

/**
 * 日期 -> 落盘路径。日期来自外部输入，除正则外再确认解析结果确实落在
 * content/daily 内，避免任何形式的路径穿越。
 */
export function dailyFilePath(date: string): string | null {
  if (!isValidDate(date)) return null
  const file = path.resolve(CONTENT_DIR, `${date}.md`)
  if (path.dirname(file) !== path.resolve(CONTENT_DIR)) return null
  return file
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v))
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

/** 单次请求内只扫描一次目录：页面、导航、目录树会重复调用下面的读取函数 */
const readAll = cache((): Daily[] => {
  if (!fs.existsSync(CONTENT_DIR)) return []

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))

  const items = files.map((file) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8')
    const { data, content } = matter(raw)

    const slug = file.replace(/\.mdx?$/, '')
    const date = DATE_RE.test(String(data.date ?? '')) ? String(data.date) : slug

    const plain = content.replace(/[#>*`\-\[\]()|]/g, '')
    const wordCount = plain.replace(/\s+/g, '').length

    return {
      date,
      title: String(data.title ?? `AI 日报 · ${date}`),
      issue: typeof data.issue === 'number' ? data.issue : undefined,
      summary: data.summary ? String(data.summary) : undefined,
      tags: toArray(data.tags),
      highlights: toArray(data.highlights),
      editor: data.editor ? String(data.editor) : undefined,
      content,
      wordCount,
      readingMinutes: Math.max(1, Math.round(wordCount / 400)),
    } satisfies Daily
  })

  // 按日期倒序：最新在前
  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
})

export function getAllDailies(): Daily[] {
  return readAll()
}

export function getAllMeta(): DailyMeta[] {
  return readAll().map(({ content: _content, ...rest }) => rest)
}

export function getDailyByDate(date: string): Daily | undefined {
  return readAll().find((d) => d.date === date)
}

/** 把某一时刻平移到 UTC+8，便于直接取「墙上时钟」的年月日时分秒 */
function shiftToTz(now: Date): Date {
  return new Date(now.getTime() + TZ_OFFSET_MS)
}

/** 当前 UTC+8 日期，格式 YYYY-MM-DD */
export function today(now = new Date()): string {
  return shiftToTz(now).toISOString().slice(0, 10)
}

/** 当前 UTC+8 时刻，格式 YYYY-MM-DD HH:mm:ss（服务端渲染时钟初值） */
export function nowStamp(now = new Date()): string {
  return shiftToTz(now).toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * 解析要展示的日报：优先当前 UTC+8 日期，
 * 若当日尚未发布则回退到站内最新一则。
 */
export function resolveCurrentDaily(now = new Date()): {
  daily?: Daily
  isToday: boolean
  today: string
} {
  const date = today(now)
  const all = readAll()
  const exact = all.find((d) => d.date === date)
  return {
    daily: exact ?? all[0],
    isToday: Boolean(exact),
    today: date,
  }
}

/** 相邻期数：newer = 更新的一期，older = 更早的一期 */
export function getNeighbors(date: string): {
  newer?: DailyMeta
  older?: DailyMeta
} {
  const all = getAllMeta()
  const i = all.findIndex((d) => d.date === date)
  if (i === -1) return {}
  return { newer: all[i - 1], older: all[i + 1] }
}

/** 按 年-月 分组，用于侧边归档 */
export function groupByMonth(items: DailyMeta[]) {
  const groups = new Map<string, DailyMeta[]>()
  for (const item of items) {
    const key = item.date.slice(0, 7)
    const list = groups.get(key)
    if (list) list.push(item)
    else groups.set(key, [item])
  }
  return [...groups.entries()].map(([month, list]) => ({ month, list }))
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function formatFullDate(date: string) {
  const d = new Date(`${date}T00:00:00Z`)
  return `${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日 · ${WEEKDAYS[d.getUTCDay()]}`
}

export function formatMonth(month: string) {
  const [y, m] = month.split('-')
  return `${y} 年 ${Number(m)} 月`
}

export function formatDayShort(date: string) {
  const [, m, d] = date.split('-')
  return `${Number(m)}/${Number(d)}`
}
