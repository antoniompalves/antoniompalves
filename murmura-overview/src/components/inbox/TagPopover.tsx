import { useState } from 'react'
import type { RefObject } from 'react'
import { Hash } from 'lucide-react'
import { normalizeTag } from '../../data/inbox'
import { Popover } from '../Popover'

interface TagPopoverProps {
  open: boolean
  onClose: () => void
  anchor: RefObject<HTMLElement | null>
  placement?: 'bottom-start' | 'bottom-end'
  suggestions: string[]
  onAdd: (tag: string) => void
}

/** "Add a tag" (".ib-tagpop"): type a new tag or pick one the workspace already uses. */
export function TagPopover({ open, onClose, anchor, placement = 'bottom-start', suggestions, onAdd }: TagPopoverProps) {
  const [value, setValue] = useState('')
  const add = (raw: string) => {
    const tag = normalizeTag(raw)
    if (tag) onAdd(tag)
    setValue('')
    onClose()
  }
  // Touch keyboards would cover the suggestions, so only fine pointers get autofocus.
  const finePointer = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches
  return (
    <Popover open={open} onClose={onClose} anchor={anchor} placement={placement} label="Add a tag">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          add(value)
        }}
        className="grid w-[min(300px,calc(100vw-48px))] gap-2.5 p-2"
      >
        <label className="flex h-[42px] min-w-0 items-center gap-2 rounded-full border border-line-2 bg-glass-2 px-4 text-muted focus-within:border-text">
          <Hash size={20} aria-hidden className="shrink-0" />
          <input
            autoFocus={finePointer}
            name="tag"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Add a tag"
            maxLength={24}
            autoComplete="off"
            aria-label="New tag"
            className="size-full min-w-0 bg-transparent text-md text-text outline-none placeholder:text-faint"
          />
        </label>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => add(t)}
                style={{ animationDelay: `${i * 20}ms` }}
                className="inline-flex h-[34px] animate-chip-in cursor-pointer items-center whitespace-nowrap rounded-full border border-line bg-glass-2 px-[13px] text-2xs font-semibold hover:bg-glass-3 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:px-3.5"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </form>
    </Popover>
  )
}
