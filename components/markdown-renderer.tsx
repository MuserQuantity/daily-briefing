import type { ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Check,
  ChevronRight,
  Info,
  Lightbulb,
  Link2,
  Minus,
  Quote,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------------------------------- utils --------------------------------- */

type HastNode = {
  type?: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

function nodeText(node?: HastNode): string {
  if (!node) return ''
  if (node.type === 'text') return node.value ?? ''
  return (node.children ?? []).map(nodeText).join('')
}

/** djb2 哈希，用于给非 ASCII 标题生成稳定短后缀 */
function hashText(text: string) {
  let h = 5381
  for (let i = 0; i < text.length; i++) {
    h = (((h << 5) + h) ^ text.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

/**
 * 生成稳定且 **纯 ASCII** 的锚点 id。
 * 中文等非 ASCII 标题若直接做 id，浏览器会把 href 百分号编码，
 * 而 `document.querySelector('#%E6%A8%A1...')` 不是合法选择器，会抛 SyntaxError。
 * 因此这里对含非 ASCII 的标题改用「可读前缀 + 哈希」的形式。
 */
export function slugify(text: string) {
  const base = text.trim().toLowerCase()
  const ascii = base
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  // id 必须以字母开头，否则 `#2026` 这类选择器同样非法
  const safe = /^[a-z]/.test(ascii) ? ascii : ascii && `sec-${ascii}`

  if (!/[^\u0020-\u007F]/.test(base)) return safe || 'section'
  return safe ? `${safe}-${hashText(base)}` : `sec-${hashText(base)}`
}

/**
 * 归一化站内锚点链接：正文里可以直接写 `#模型与产品`，
 * 这里把它转换成与标题 id 一致的 ASCII 形式。
 */
export function resolveHash(href?: string) {
  if (!href || !href.startsWith('#')) return href
  let raw = href.slice(1)
  try {
    raw = decodeURIComponent(raw)
  } catch {
    // 保留原值
  }
  if (!raw || !/[^\u0020-\u007F]/.test(raw)) return href
  return `#${slugify(raw)}`
}

/** 按 | 拆分行，供表格型自定义块使用 */
function splitRows(raw: string) {
  return raw
    .trim()
    .split('\n')
    .map((line) => line.split('|').map((s) => s.trim()))
    .filter((cells) => cells[0])
}

/* --------------------------------- callouts -------------------------------- */

const CALLOUTS = {
  NOTE: {
    label: '说明',
    icon: Info,
    text: 'text-info',
    surface: 'border-info-line bg-info-surface',
  },
  TIP: {
    label: '提示',
    icon: Lightbulb,
    text: 'text-success',
    surface: 'border-success-line bg-success-surface',
  },
  IMPORTANT: {
    label: '重点',
    icon: ChevronRight,
    text: 'text-primary',
    surface: 'border-primary/25 bg-primary/[0.045]',
  },
  WARNING: {
    label: '注意',
    icon: AlertTriangle,
    text: 'text-warning',
    surface: 'border-warning-line bg-warning-surface',
  },
  CAUTION: {
    label: '风险',
    icon: Ban,
    text: 'text-destructive',
    surface: 'border-destructive-line bg-destructive-surface',
  },
} as const

type CalloutType = keyof typeof CALLOUTS

function Callout({
  type,
  title,
  children,
}: {
  type: CalloutType
  title?: string
  children: ReactNode
}) {
  const conf = CALLOUTS[type]
  const Icon = conf.icon
  return (
    <div className={cn('my-6 flex gap-3 rounded-md border px-4 py-3.5', conf.surface)}>
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', conf.text)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 text-[0.95rem] leading-relaxed text-foreground/85 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2 [&_p]:text-[0.95rem] [&_p]:leading-relaxed [&_p]:text-foreground/85 [&_ul]:my-2 [&_ol]:my-2">
        {title ? (
          <p className={cn('mb-1 text-[0.95rem] font-semibold', conf.text)}>
            {title}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  )
}

/* ------------------------------ 自定义围栏块 ------------------------------ */

/** ```stat  ->  指标卡片：标签 | 数值 | 变化 */
function StatGrid({ raw }: { raw: string }) {
  const rows = splitRows(raw)
  return (
    <div className="my-6 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value, delta], i) => {
        const down = delta?.startsWith('-')
        const Trend = down ? TrendingDown : TrendingUp
        return (
          <div key={i} className="bg-background px-4 py-3.5">
            <p className="eyebrow text-muted-foreground">{label}</p>
            <p className="mt-2 font-mono text-[1.6rem] font-normal leading-none tabular-nums text-foreground">
              {value}
            </p>
            {delta ? (
              <p
                className={cn(
                  'mt-2 flex items-center gap-1 font-mono text-xs tabular-nums',
                  down ? 'text-destructive' : 'text-success',
                )}
              >
                <Trend className="size-3" aria-hidden="true" />
                {delta}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

/** ```quote  ->  大字引言，末行以 — 开头视为出处 */
function PullQuote({ raw }: { raw: string }) {
  const lines = raw.trim().split('\n')
  const last = lines[lines.length - 1] ?? ''
  const hasSource = /^\s*[—–-]\s+/.test(last) && lines.length > 1
  const body = (hasSource ? lines.slice(0, -1) : lines).join(' ')
  const source = hasSource ? last.replace(/^\s*[—–-]\s+/, '') : undefined

  return (
    <figure className="my-8 rounded-md border border-border bg-card px-5 py-5 sm:px-6">
      <Quote className="mb-3 size-4 text-primary" aria-hidden="true" />
      <blockquote className="text-pretty text-lg font-light leading-relaxed text-foreground sm:text-xl">
        {body}
      </blockquote>
      {source ? (
        <figcaption className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-px w-6 bg-border-strong" aria-hidden="true" />
          {source}
        </figcaption>
      ) : null}
    </figure>
  )
}

/** ```sources  ->  信息来源列表：标题 | 链接 | 备注? */
function SourceList({ raw }: { raw: string }) {
  const rows = splitRows(raw)
  return (
    <div className="my-6 overflow-hidden rounded-md border border-border">
      <p className="eyebrow border-b border-border bg-card px-4 py-2.5 text-muted-foreground">
        信息来源
      </p>
      <ul className="divide-y divide-border">
        {rows.map(([title, href, note], i) => (
          <li key={i}>
            <a
              href={href || '#'}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent"
            >
              <span className="min-w-0 flex-1 truncate text-foreground/85">
                {title}
              </span>
              {note ? (
                <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:block">
                  {note}
                </span>
              ) : null}
              <ArrowUpRight
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** ```kv  ->  参数对照表：键 | 值 */
function KeyValues({ raw }: { raw: string }) {
  const rows = splitRows(raw)
  return (
    <dl className="my-6 divide-y divide-border overflow-hidden rounded-md border border-border">
      {rows.map(([k, v], i) => (
        <div
          key={i}
          className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-6"
        >
          <dt className="eyebrow text-muted-foreground sm:w-44 sm:shrink-0 sm:pt-0.5">
            {k}
          </dt>
          <dd className="min-w-0 text-sm leading-relaxed text-foreground/85">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** ```compare  ->  横向对比表：首行为表头，单元格支持 yes/no/na */
function CompareTable({ raw }: { raw: string }) {
  const rows = splitRows(raw)
  if (!rows.length) return null
  const [head, ...body] = rows

  const mark = (cell: string) => {
    const v = cell.toLowerCase()
    if (v === 'yes' || v === 'y' || v === 'true')
      return <Check className="size-4 text-success" aria-label="支持" />
    if (v === 'no' || v === 'n' || v === 'false')
      return <X className="size-4 text-destructive" aria-label="不支持" />
    if (v === 'na' || v === '-' || v === '—')
      return <Minus className="size-4 text-muted-foreground" aria-label="不适用" />
    return <span className="text-foreground/85">{cell}</span>
  }

  return (
    <div className="scroll-thin my-6 overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-card">
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className={cn(
                  'eyebrow border-b border-border px-4 py-2.5 font-normal text-muted-foreground',
                  i === 0 ? 'text-left' : 'text-center',
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {body.map((cells, r) => (
            <tr key={r} className="transition-colors hover:bg-accent/60">
              {cells.map((cell, c) => (
                <td
                  key={c}
                  className={cn(
                    'px-4 py-3 align-middle',
                    c === 0
                      ? 'font-medium text-foreground'
                      : 'text-center',
                  )}
                >
                  {c === 0 ? cell : <span className="inline-flex justify-center">{mark(cell)}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** ```timeline  ->  时间线：时刻 | 事件 | 说明? */
function Timeline({ raw }: { raw: string }) {
  const rows = splitRows(raw)
  return (
    <ol className="my-6 flex flex-col">
      {rows.map(([time, event, note], i) => (
        <li key={i} className="flex gap-4">
          <div className="flex flex-col items-center pt-1.5">
            <span
              className="size-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            {i < rows.length - 1 ? (
              <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
            ) : null}
          </div>
          <div className={cn('min-w-0 flex-1', i < rows.length - 1 && 'pb-5')}>
            <p className="eyebrow text-muted-foreground">{time}</p>
            <p className="mt-1.5 text-[0.95rem] font-medium leading-snug text-foreground">
              {event}
            </p>
            {note ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {note}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

/** ```cards  ->  导读卡片：标题 | 描述 | 链接? */
function CardGrid({ raw }: { raw: string }) {
  const rows = splitRows(raw)
  return (
    <div className="my-6 grid gap-3 sm:grid-cols-2">
      {rows.map(([title, desc, href], i) => {
        const inner = (
          <>
            <p className="border-b border-border px-4 py-3 text-[0.95rem] font-medium text-foreground">
              {title}
            </p>
            {desc ? (
              <p className="px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                {desc}
              </p>
            ) : null}
          </>
        )
        return href ? (
          <a
            key={i}
            href={resolveHash(href)}
            target={/^https?:/.test(href) ? '_blank' : undefined}
            rel={/^https?:/.test(href) ? 'noreferrer noopener' : undefined}
            className="overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-border-strong hover:bg-accent"
          >
            {inner}
          </a>
        ) : (
          <div
            key={i}
            className="overflow-hidden rounded-md border border-border bg-card"
          >
            {inner}
          </div>
        )
      })}
    </div>
  )
}

function CodeBlock({ lang, raw }: { lang?: string; raw: string }) {
  return (
    <div className="my-6 overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <span className="eyebrow text-muted-foreground">{lang || 'text'}</span>
      </div>
      <pre className="scroll-thin overflow-x-auto bg-background px-4 py-3.5">
        <code className="font-mono text-[13px] leading-relaxed text-foreground/85">
          {raw}
        </code>
      </pre>
    </div>
  )
}

/* --------------------------------- headings -------------------------------- */

function Heading({
  level,
  children,
  node,
}: {
  level: 2 | 3 | 4
  children: ReactNode
  node?: HastNode
}) {
  const id = slugify(nodeText(node))
  const Tag = `h${level}` as 'h2' | 'h3' | 'h4'
  const styles = {
    2: 'mt-12 mb-4 text-[1.55rem] font-light tracking-[0.01em]',
    3: 'mt-9 mb-3 text-[1.15rem] font-medium',
    4: 'mt-7 mb-2 text-[0.975rem] font-semibold',
  }[level]

  return (
    <Tag
      id={id}
      className={cn('group flex scroll-mt-24 items-center gap-2 text-pretty text-foreground', styles)}
    >
      <span className="min-w-0">{children}</span>
      <a
        href={`#${id}`}
        aria-label={`链接到「${nodeText(node)}」`}
        className="anchor-link shrink-0 text-muted-foreground hover:text-primary"
      >
        <Link2 className="size-3.5" aria-hidden="true" />
      </a>
    </Tag>
  )
}

/* -------------------------------- components ------------------------------- */

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-10 mb-4 text-pretty text-3xl font-light tracking-[0.01em] text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children, node }) => (
    <Heading level={2} node={node as HastNode}>
      {children}
    </Heading>
  ),
  h3: ({ children, node }) => (
    <Heading level={3} node={node as HastNode}>
      {children}
    </Heading>
  ),
  h4: ({ children, node }) => (
    <Heading level={4} node={node as HastNode}>
      {children}
    </Heading>
  ),
  p: ({ children }) => (
    <p className="my-4 text-pretty text-[0.975rem] leading-[1.75] text-foreground/85">
      {children}
    </p>
  ),
  a: ({ href, children }) => {
    const external = Boolean(href && /^https?:/.test(href))
    return (
      <a
        href={resolveHash(href)}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer noopener' : undefined}
        className="text-foreground underline decoration-border-strong decoration-1 underline-offset-[3px] transition-colors hover:text-primary hover:decoration-primary"
      >
        {children}
      </a>
    )
  },
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-foreground">{children}</em>,
  del: ({ children }) => (
    <del className="text-muted-foreground line-through">{children}</del>
  ),
  ul: ({ children }) => (
    <ul className="my-4 flex list-disc flex-col gap-2 pl-5 marker:text-border-strong">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 flex list-decimal flex-col gap-2 pl-5 marker:font-mono marker:text-[13px] marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[0.95rem] leading-[1.75] text-foreground/85 [&>p]:my-0 [&_ul]:mt-2 [&_ul]:mb-0 [&_ol]:mt-2 [&_ol]:mb-0">
      {children}
    </li>
  ),
  hr: () => <hr className="my-10 border-t border-border" />,
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-2 border-border-strong pl-4 text-[0.95rem] leading-relaxed text-muted-foreground [&>p]:my-2">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="scroll-thin my-6 overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-card">{children}</thead>,
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-accent/60">{children}</tr>
  ),
  th: ({ children }) => (
    <th
      scope="col"
      className="eyebrow border-b border-border px-4 py-2.5 text-left font-normal text-muted-foreground"
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 align-top leading-relaxed text-foreground/85">
      {children}
    </td>
  ),
  img: ({ src, alt }) => (
    <figure className="my-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={typeof src === 'string' ? src : '/placeholder.svg'}
        alt={alt ?? ''}
        className="w-full rounded-md border border-border"
      />
      {alt ? (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {alt}
        </figcaption>
      ) : null}
    </figure>
  ),
  code: ({ className, children }) => {
    // 块级代码交由 pre 接管，这里只处理行内代码
    if (className?.startsWith('language-')) return <>{children}</>
    return (
      <code className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
        {children}
      </code>
    )
  },
  pre: ({ node }) => {
    const codeEl = (node as HastNode)?.children?.find((c) => c.tagName === 'code')
    const raw = nodeText(codeEl).replace(/\n$/, '')
    const classNames = (codeEl?.properties?.className as string[]) ?? []
    const lang = classNames
      .find((c) => c.startsWith('language-'))
      ?.replace('language-', '')

    if (lang?.startsWith('callout')) {
      const [, type = 'NOTE', title = ''] = lang.split(':')
      const upper = type.toUpperCase()
      const key = (upper in CALLOUTS ? upper : 'NOTE') as CalloutType
      return (
        <Callout type={key} title={title.replace(/\u00a0/g, ' ') || undefined}>
          <Markdown remarkPlugins={[remarkGfm]} components={components}>
            {raw}
          </Markdown>
        </Callout>
      )
    }

    switch (lang) {
      case 'stat':
        return <StatGrid raw={raw} />
      case 'quote':
        return <PullQuote raw={raw} />
      case 'sources':
        return <SourceList raw={raw} />
      case 'kv':
        return <KeyValues raw={raw} />
      case 'compare':
        return <CompareTable raw={raw} />
      case 'timeline':
        return <Timeline raw={raw} />
      case 'cards':
        return <CardGrid raw={raw} />
      default:
        return <CodeBlock lang={lang} raw={raw} />
    }
  },
}

/* ------------------------------- 预处理 & 目录 ------------------------------ */

/** 去掉整块共有的行首缩进，保留相对层级 */
function dedent(lines: string[]) {
  const indents = lines
    .filter((l) => l.trim())
    .map((l) => (/^\s*/.exec(l)?.[0].length ?? 0))
  const min = indents.length ? Math.min(...indents) : 0
  return min > 0 ? lines.map((l) => l.slice(min)) : lines
}

/**
 * GitHub 风格提示块 -> 自定义围栏块，交给 pre 渲染：
 *   > [!TIP] 标题        ```callout:TIP:标题
 *   > 正文          ->   正文
 *                        ```
 */
function preprocessAlerts(md: string) {
  const lines = md.split('\n')
  const out: string[] = []
  let inFence = false

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) inFence = !inFence

    const match = inFence ? null : /^>\s*\[!(\w+)\]\s*(.*)$/.exec(lines[i])
    if (!match || !(match[1].toUpperCase() in CALLOUTS)) {
      out.push(lines[i])
      continue
    }

    const type = match[1].toUpperCase()
    const title = match[2].trim().replace(/\s+/g, '\u00a0')
    const body: string[] = []
    let j = i + 1
    while (j < lines.length && /^>/.test(lines[j])) {
      body.push(lines[j].replace(/^>[ \t]?/, ''))
      j++
    }
    i = j - 1

    out.push('', `\`\`\`callout:${type}:${title}`, ...dedent(body), '```', '')
  }

  return out.join('\n')
}

export type TocItem = { id: string; text: string; level: 2 | 3 }

/** 提取 h2/h3 生成右侧目录，跳过围栏代码块内的 # */
export function extractToc(md: string): TocItem[] {
  const items: TocItem[] = []
  let inFence = false

  for (const line of md.split('\n')) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const match = /^(#{2,3})\s+(.+?)\s*#*$/.exec(line)
    if (!match) continue

    const text = match[2].replace(/[*`_]/g, '').trim()
    items.push({
      id: slugify(text),
      text,
      level: match[1].length as 2 | 3,
    })
  }

  return items
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="max-w-none">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {preprocessAlerts(content)}
      </Markdown>
    </div>
  )
}
