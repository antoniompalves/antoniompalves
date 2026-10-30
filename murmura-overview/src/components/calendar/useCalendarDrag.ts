import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Post } from '../../data/types'
import { DAY_START, HOUR_PX, atMinutes, fmtTime, fromKey, minutesOfDay, snapMinutes } from '../../data/calendar'

export interface DropTarget {
  day: string
  /** Minutes from midnight of the new time. */
  minutes: number
  kind: 'week' | 'month'
  /** False when the slot is already in the past. */
  ok: boolean
}

interface Options {
  posts: Post[]
  now: Date
  onDrop: (id: string, when: Date) => void
  onDenied: () => void
}

const THRESHOLD = 5
const EDGE = 48

/**
 * Pointer-driven drag & drop for calendar posts (".cl-float .cl-clone" in the
 * reference): a fixed clone follows the pointer, the source is "lifted", and
 * whatever element under the pointer carries data-drop-day becomes the target.
 * Week columns map the clone's top edge to a 30-minute slot; month cells keep
 * the post's time of day.
 */
export function useCalendarDrag({ posts, now, onDrop, onDenied }: Options) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [target, setTarget] = useState<DropTarget | null>(null)
  const justDragged = useRef(false)

  const resolve = useCallback(
    (x: number, y: number, grabY: number, post: Post): DropTarget | null => {
      const hit = document.elementsFromPoint(x, y).find((el) => el instanceof HTMLElement && el.dataset.dropDay) as
        | HTMLElement
        | undefined
      if (!hit) return null
      const day = hit.dataset.dropDay!
      const kind = hit.dataset.dropKind === 'month' ? 'month' : 'week'
      const minutes =
        kind === 'week'
          ? snapMinutes(DAY_START * 60 + ((y - grabY - hit.getBoundingClientRect().top) / HOUR_PX) * 60)
          : minutesOfDay(new Date(post.scheduledAt))
      const ok = atMinutes(fromKey(day), minutes).getTime() > now.getTime()
      return { day, minutes, kind, ok }
    },
    [now],
  )

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>, id: string) => {
      if (e.button !== 0) return
      const post = posts.find((p) => p.id === id)
      if (!post) return
      const source = e.currentTarget
      const rect = source.getBoundingClientRect()
      const startX = e.clientX
      const startY = e.clientY
      // Week tiles keep the grab point; anything taller (drafts, rows) snaps by its top 12px.
      const grabY = Math.min(e.clientY - rect.top, HOUR_PX / 2)
      let clone: HTMLElement | null = null
      let current: DropTarget | null = null

      const move = (ev: PointerEvent) => {
        if (!clone) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < THRESHOLD) return
          clone = source.cloneNode(true) as HTMLElement
          Object.assign(clone.style, {
            position: 'fixed',
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            margin: '0',
            zIndex: '90',
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-pop)',
            opacity: '1',
          })
          clone.removeAttribute('data-drag-id')
          clone.setAttribute('aria-hidden', 'true')
          document.body.appendChild(clone)
          document.documentElement.classList.add('cl-dragging')
          setDragId(id)
        }
        clone.style.transform = `translate(${ev.clientX - startX}px, ${ev.clientY - startY}px)`
        current = resolve(ev.clientX, ev.clientY, grabY, post)
        setTarget(current)
        const label = clone.querySelector<HTMLElement>('[data-time]')
        if (label && current) label.textContent = fmtTime(atMinutes(fromKey(current.day), current.minutes))
        clone.style.outline = current && !current.ok ? '2px solid var(--bad)' : ''

        // Nudge the scrolling week grid when the pointer hugs its edges.
        const scroller = document.querySelector<HTMLElement>('[data-drag-scroll]')
        if (scroller) {
          const r = scroller.getBoundingClientRect()
          const head = scroller.querySelector<HTMLElement>('[data-week-head]')?.offsetHeight ?? 0
          if (ev.clientX > r.left && ev.clientX < r.right) {
            if (ev.clientY < r.top + head + EDGE && ev.clientY > r.top) scroller.scrollTop -= 14
            else if (ev.clientY > r.bottom - EDGE && ev.clientY < r.bottom + 20) scroller.scrollTop += 14
          }
        }
      }

      const end = (commit: boolean) => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', cancel)
        window.removeEventListener('keydown', esc)
        if (!clone) return
        clone.remove()
        document.documentElement.classList.remove('cl-dragging')
        justDragged.current = true
        window.setTimeout(() => (justDragged.current = false), 0)
        setDragId(null)
        setTarget(null)
        if (!commit || !current) return
        if (current.ok) onDrop(id, atMinutes(fromKey(current.day), current.minutes))
        else onDenied()
      }
      const up = () => end(true)
      const cancel = () => end(false)
      const esc = (ev: KeyboardEvent) => ev.key === 'Escape' && end(false)

      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', cancel)
      window.addEventListener('keydown', esc)
    },
    [posts, resolve, onDrop, onDenied],
  )

  return {
    dragId,
    target,
    onPointerDown,
    /** True right after a drag ends, so the click that follows doesn't open the post. */
    wasDragged: () => justDragged.current,
  }
}
