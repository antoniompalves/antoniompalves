import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ComponentPropsWithoutRef, ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from './ui'

type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

interface PopoverProps {
  open: boolean
  onClose: () => void
  anchor: RefObject<HTMLElement | null>
  placement?: Placement
  label: string
  className?: string
  children: ReactNode
}

/**
 * Floating panel (".pop" in the reference): fixed to its trigger so it never
 * gets clipped by scrolling panes, closes on outside click and Escape.
 */
export function Popover({ open, onClose, anchor, placement = 'bottom-start', label, className, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    if (!open || !anchor.current || !ref.current) return
    const r = anchor.current.getBoundingClientRect()
    // offset* ignore the entry animation's transform; client* leave out scrollbars, which fixed offsets do too.
    const { offsetWidth: w, offsetHeight: h } = ref.current
    const { clientWidth, clientHeight } = document.documentElement
    const gap = 8
    const edge = 12
    // Prefer the requested side, flip when it has no room for the panel.
    let below = placement.startsWith('bottom')
    if (below && r.bottom + gap + h > clientHeight - edge && r.top - gap - h >= edge) below = false
    else if (!below && r.top - gap - h < edge && r.bottom + gap + h <= clientHeight - edge) below = true
    const left = placement.endsWith('start') ? r.left : r.right - w
    setPos({
      ...(below ? { top: r.bottom + gap } : { bottom: clientHeight - r.top + gap }),
      left: Math.max(edge, Math.min(left, clientWidth - edge - w)),
    })
  }, [open, anchor, placement])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !anchor.current?.contains(t)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
      anchor.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose, anchor])

  if (!open) return null
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      style={pos}
      className={cn(
        'fixed z-[85] max-h-[min(72vh,560px)] min-w-[210px] max-w-[min(380px,calc(100vw-24px))] animate-rise overflow-auto rounded-[18px] border border-line bg-float p-1.5 text-text shadow-pop',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  )
}

interface MenuItemProps extends ComponentPropsWithoutRef<'button'> {
  icon?: LucideIcon
  lead?: ReactNode
  checked?: boolean
}

/** Row inside a popover menu (".menu__item"). */
export function MenuItem({ icon: Icon, lead, checked, className, children, ...rest }: MenuItemProps) {
  return (
    <button
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={checked}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold outline-none hover:bg-well focus-visible:bg-well disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-[46px]',
        className,
      )}
      {...rest}
    >
      {Icon && <Icon size={18} aria-hidden className="shrink-0" />}
      {lead}
      <span className="min-w-0 truncate">{children}</span>
      {checked && <Check size={18} aria-hidden className="ml-auto shrink-0" />}
    </button>
  )
}

export const MenuDivider = () => <hr className="mx-1.5 my-1 h-px border-0 bg-line" />
