import { createHash, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { NextResponse } from 'next/server'
import {
  CONTENT_DIR,
  dailyFilePath,
  getAllMeta,
  isValidDate,
  today,
} from '@/lib/daily'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 单期日报的正文上限，正常一期在 10 KB 量级 */
const MAX_BYTES = 1024 * 1024

/* --------------------------------- 鉴权 --------------------------------- */

/** 先哈希再定长比较：既避免时序侧信道，也不泄漏密钥长度 */
function secretEquals(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

function fail(status: number, error: string, message: string) {
  return NextResponse.json({ ok: false, error, message }, { status })
}

/** 通过返回 null，否则返回要直接下发的错误响应 */
function authorize(req: Request) {
  const expected = process.env.DAILY_API_TOKEN
  // 未配置密钥时保持关闭，避免误部署出一个公开可写的接口
  if (!expected) {
    return fail(
      503,
      'api_disabled',
      '未配置 DAILY_API_TOKEN，推送接口处于关闭状态',
    )
  }

  const header = req.headers.get('authorization') ?? ''
  const presented = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!presented || !secretEquals(presented, expected)) {
    return fail(401, 'unauthorized', 'Authorization 头缺失或密钥不正确')
  }
  return null
}

/* ------------------------------- 请求体解析 ------------------------------- */

type Parsed = { date: string; body: string }

function asStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined
  const list = Array.isArray(value) ? value : [value]
  const items = list.filter((v) => typeof v === 'string' && v.trim())
  return items.length ? (items as string[]) : undefined
}

/** application/json：服务端负责拼 frontmatter，客户端不用关心 YAML 转义 */
function fromJson(raw: string, queryDate?: string): Parsed | string {
  let payload: Record<string, unknown>
  try {
    const decoded: unknown = JSON.parse(raw)
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
      return '请求体需要是一个 JSON 对象'
    }
    payload = decoded as Record<string, unknown>
  } catch {
    return 'JSON 解析失败'
  }

  const date = queryDate ?? payload.date
  if (typeof date !== 'string' || !isValidDate(date)) {
    return 'date 缺失或不是合法日期，格式为 YYYY-MM-DD'
  }

  const content = payload.content
  if (typeof content !== 'string' || !content.trim()) {
    return 'content 缺失或为空'
  }

  // 按 FORMAT.md 的字段顺序拼装，只写入实际提供的字段
  const data: Record<string, unknown> = {}
  if (typeof payload.title === 'string' && payload.title.trim()) {
    data.title = payload.title.trim()
  }
  data.date = date
  if (typeof payload.issue === 'number' && Number.isFinite(payload.issue)) {
    data.issue = payload.issue
  }
  if (typeof payload.editor === 'string' && payload.editor.trim()) {
    data.editor = payload.editor.trim()
  }
  if (typeof payload.summary === 'string' && payload.summary.trim()) {
    data.summary = payload.summary.trim()
  }
  const tags = asStringArray(payload.tags)
  if (tags) data.tags = tags
  const highlights = asStringArray(payload.highlights)
  if (highlights) data.highlights = highlights

  return { date, body: matter.stringify(`${content.trim()}\n`, data) }
}

/** text/markdown：原样落盘，日期取 ?date= 或 frontmatter 里的 date */
function fromMarkdown(raw: string, queryDate?: string): Parsed | string {
  if (!raw.trim()) return '请求体为空'

  let frontmatterDate: string | undefined
  try {
    const { data } = matter(raw)
    if (typeof data.date === 'string') frontmatterDate = data.date
  } catch (err) {
    // frontmatter 写坏了就别落盘了，否则页面渲染时才炸
    return `frontmatter 解析失败：${(err as Error).message}`
  }

  const date = queryDate ?? frontmatterDate
  if (typeof date !== 'string' || !isValidDate(date)) {
    return '无法确定日期：请带上 ?date=YYYY-MM-DD，或在 frontmatter 里写 date'
  }
  return { date, body: raw }
}

/* --------------------------------- 接口 --------------------------------- */

export async function POST(req: Request) {
  const denied = authorize(req)
  if (denied) return denied

  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > MAX_BYTES) {
    return fail(413, 'payload_too_large', `请求体超过 ${MAX_BYTES} 字节`)
  }

  const raw = await req.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) {
    return fail(413, 'payload_too_large', `请求体超过 ${MAX_BYTES} 字节`)
  }

  const mime = (req.headers.get('content-type') ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  const queryDate =
    new URL(req.url).searchParams.get('date')?.trim() || undefined

  let parsed: Parsed | string
  if (mime === 'application/json') {
    parsed = fromJson(raw, queryDate)
  } else if (mime === 'text/markdown' || mime === 'text/plain') {
    parsed = fromMarkdown(raw, queryDate)
  } else {
    return fail(
      415,
      'unsupported_media_type',
      'Content-Type 需为 application/json 或 text/markdown',
    )
  }

  if (typeof parsed === 'string') {
    return fail(400, 'invalid_request', parsed)
  }

  const file = dailyFilePath(parsed.date)
  if (!file) {
    return fail(400, 'invalid_date', `非法日期：${parsed.date}`)
  }

  const existed = await fs
    .access(file)
    .then(() => true)
    .catch(() => false)

  try {
    await fs.mkdir(CONTENT_DIR, { recursive: true })
    // 先写临时文件再 rename：页面每次请求都在读这个目录，
    // 原子替换可以避免读到写了一半的内容（.tmp 不在扫描的扩展名里）
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
    await fs.writeFile(tmp, parsed.body, 'utf8')
    await fs.rename(tmp, file)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'EACCES' || code === 'EROFS') {
      return fail(
        500,
        'content_not_writable',
        `content 目录不可写（${code}）。容器内以 uid 1001 运行，请确认挂载目录权限，且挂载未标记为只读`,
      )
    }
    return fail(500, 'write_failed', (err as Error).message)
  }

  return NextResponse.json({
    ok: true,
    action: existed ? 'updated' : 'created',
    date: parsed.date,
    file: path.relative(process.cwd(), file),
    bytes: Buffer.byteLength(parsed.body, 'utf8'),
  })
}

export async function GET(req: Request) {
  const denied = authorize(req)
  if (denied) return denied

  const items = getAllMeta()
  return NextResponse.json({
    ok: true,
    today: today(),
    count: items.length,
    items,
  })
}
