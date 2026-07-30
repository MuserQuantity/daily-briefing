import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="eyebrow text-muted-foreground">404</p>
      <h1 className="text-3xl font-light tracking-[0.01em] text-foreground">
        没有找到这一期日报
      </h1>
      <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
        该日期可能还没有发布，或者链接有误。
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-[13px] text-foreground transition-colors hover:border-border-strong hover:bg-accent"
      >
        查看今日日报
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </main>
  )
}
