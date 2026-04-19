'use client'
import { useState } from 'react'
import { Zap, ArrowUpCircle, Wrench, Shield, type LucideIcon } from 'lucide-react'
import type { UpdateRow } from '@/db/queries/updates'

const CATEGORIES = ['전체', '신기능', '개선', '버그수정', '보안'] as const
type Category = typeof CATEGORIES[number]

interface CategoryStyle {
  badge: string
  bar: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  '신기능':   { badge: 'bg-indigo-100 text-indigo-700',  bar: 'bg-indigo-500',  icon: Zap,           iconColor: 'text-indigo-600',  iconBg: 'bg-indigo-100' },
  '개선':     { badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', icon: ArrowUpCircle, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  '버그수정': { badge: 'bg-amber-100 text-amber-700',     bar: 'bg-amber-500',   icon: Wrench,        iconColor: 'text-amber-600',   iconBg: 'bg-amber-100' },
  '보안':     { badge: 'bg-rose-100 text-rose-700',       bar: 'bg-rose-500',    icon: Shield,        iconColor: 'text-rose-600',    iconBg: 'bg-rose-100' },
}

const DEFAULT_STYLE: CategoryStyle = {
  badge: 'bg-gray-100 text-gray-600',
  bar: 'bg-gray-400',
  icon: ArrowUpCircle,
  iconColor: 'text-gray-500',
  iconBg: 'bg-gray-100',
}

export function UpdatesFeed({ items }: { items: UpdateRow[] }) {
  const [activeFilter, setActiveFilter] = useState<Category>('전체')

  const filtered = activeFilter === '전체'
    ? items
    : items.filter(item => item.category === activeFilter)

  return (
    <div data-component="UpdatesFeed" className="space-y-4">
      <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-100">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border ${
              activeFilter === cat
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center text-gray-400">
          해당 카테고리의 업데이트 내역이 없습니다.
        </div>
      ) : (
        <ul className="w-full">
          {filtered.map((item, idx) => {
            const style = CATEGORY_STYLES[item.category] ?? DEFAULT_STYLE
            const Icon = style.icon
            const isLatest = idx === 0
            const isLast = idx === filtered.length - 1

            return (
              <li key={item.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`flex-none flex items-center justify-center w-9 h-9 rounded-full ${style.iconBg} ${style.iconColor} ring-4 ring-white z-10`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                </div>

                <div className={`min-w-0 flex-1 border border-gray-200 rounded-xl p-4 bg-white ${isLast ? 'mb-0' : 'mb-4'}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <time className="font-mono text-sm text-gray-500">{item.date}</time>
                    <span className="text-gray-300">·</span>
                    <span className="font-mono text-xs font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                      {item.version}
                    </span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${style.badge}`}>
                      {item.category}
                    </span>
                    {isLatest && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                        최신
                      </span>
                    )}
                  </div>

                  <div className="text-base font-bold text-gray-900 mb-2">{item.title}</div>

                  <ul className="space-y-1">
                    {item.items.map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" aria-hidden="true" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
