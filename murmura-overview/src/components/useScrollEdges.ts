import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

/**
 * Tracks whether a horizontal scroller is at its start or end, so phones can
 * fade out only the edge that still hides content (".is-mid" / ".is-end").
 * Pair the returned style with `EDGE_FADE`.
 */
export function useScrollEdges<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 })
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  const style = { '--fl': edges.start ? '0px' : '22px', '--fr': edges.end ? '0px' : '28px' } as CSSProperties
  return { ref, style }
}

/** Phone-only mask that fades the scroller's hidden edges (sizes from `useScrollEdges`). */
export const EDGE_FADE = 'max-mobile:[mask-image:linear-gradient(90deg,transparent,#000_var(--fl),#000_calc(100%_-_var(--fr)),transparent)]'
