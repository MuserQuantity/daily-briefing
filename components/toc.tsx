'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '@/components/markdown-renderer'
import { cn } from '@/lib/utils'

export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? '')

  useEffect(() => {
    if (!items.length) return

    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => Boolean(el))

    if (!headings.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible[0]) {
          setActive(visible[0].target.id)
          return
        }
        // 全部滑出视口时，取最后一个已越过顶部的标题
        const passed = headings.filter(
          (h) => h.getBoundingClientRect().top < 120,
        )
        if (passed.length) setActive(passed[passed.length - 1].id)
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: [0, 1] },
    )

    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  }, [items])

  if (items.length < 2) return null

  return (
    <nav aria-label="本页目录" className="flex flex-col gap-3">
      <p className="eyebrow text-muted-foreground">本页目录</p>
      <ul className="flex flex-col gap-0.5 border-l border-border">
        {items.map((item) => {
          const isActive = item.id === active
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  '-ml-px block border-l py-1 text-[13px] leading-snug transition-colors',
                  item.level === 3 ? 'pl-6' : 'pl-3',
                  isActive
                    ? 'border-primary font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground',
                )}
              >
                {item.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
