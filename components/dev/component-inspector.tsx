'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

// React internal types (dev-mode only)
interface DebugSource {
  fileName: string
  lineNumber: number
  columnNumber?: number
}

interface Fiber {
  type: unknown
  return: Fiber | null
  _debugSource?: DebugSource
}

function getFiber(el: Element): Fiber | null {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'))
  if (!key) return null
  return (el as unknown as Record<string, Fiber>)[key] ?? null
}

function findNamedComponent(fiber: Fiber | null): { name: string; source?: DebugSource } | null {
  let f = fiber
  while (f) {
    const t = f.type
    if (t && (typeof t === 'function' || typeof t === 'object')) {
      const name = (t as { displayName?: string; name?: string }).displayName
        ?? (t as { name?: string }).name
      if (name && name.length > 1 && !/^[a-z_$]/.test(name) && name !== 'Component') {
        return { name, source: f._debugSource }
      }
    }
    f = f.return
  }
  return null
}

function toRelativePath(absolute: string): string {
  const match = absolute.match(/\/(app|components|lib|utils|db|hooks)\/.*/)
  return match ? match[0].slice(1) : absolute
}

interface Target {
  rect: DOMRect
  name: string
  source?: DebugSource
}

export function ComponentInspector() {
  const [altDown, setAltDown] = useState(false)
  const [target, setTarget] = useState<Target | null>(null)
  const lastEl = useRef<Element | null>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey && !altDown) setAltDown(true)
    }
    function onKeyUp(e: KeyboardEvent) {
      if (!e.altKey) { setAltDown(false); setTarget(null) }
    }
    function onBlur() { setAltDown(false); setTarget(null) }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [altDown])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!e.altKey) { setTarget(null); return }
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el || el === lastEl.current) return
      lastEl.current = el

      const fiber = getFiber(el)
      const comp = findNamedComponent(fiber)
      if (!comp) { setTarget(null); return }

      setTarget({ rect: el.getBoundingClientRect(), name: comp.name, source: comp.source })
    }

    function onClick(e: MouseEvent) {
      if (!e.altKey || !target) return
      e.preventDefault()
      e.stopPropagation()
      const label = target.source
        ? `${target.name} (${toRelativePath(target.source.fileName)}:${target.source.lineNumber})`
        : target.name
      navigator.clipboard.writeText(label).then(() => {
        toast.success('Copied', { description: label, duration: 2000 })
      })
    }

    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('click', onClick, true)
    }
  }, [target])

  if (!altDown || !target) return null

  const { rect, name, source } = target
  const label = source
    ? `${name}  ·  ${toRelativePath(source.fileName)}:${source.lineNumber}`
    : name

  const PADDING = 4
  const labelTop = rect.top > 32 ? rect.top - 28 : rect.bottom + 6

  return (
    <>
      {/* outline */}
      <div
        className="fixed pointer-events-none z-[9998] rounded-sm"
        style={{
          top: rect.top - PADDING,
          left: rect.left - PADDING,
          width: rect.width + PADDING * 2,
          height: rect.height + PADDING * 2,
          outline: '2px solid #60a5fa',
          outlineOffset: 0,
          backgroundColor: 'rgba(96,165,250,0.06)',
        }}
      />
      {/* label */}
      <div
        className="fixed pointer-events-none z-[9999] px-2 py-0.5 rounded text-[11px] font-mono font-medium text-white"
        style={{
          top: labelTop,
          left: Math.max(4, Math.min(rect.left, window.innerWidth - 400)),
          background: 'rgba(15,23,42,0.92)',
          border: '1px solid rgba(96,165,250,0.4)',
          backdropFilter: 'blur(4px)',
          maxWidth: 'calc(100vw - 16px)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
        <span className="ml-2 opacity-40 text-[10px]">click to copy</span>
      </div>
    </>
  )
}
