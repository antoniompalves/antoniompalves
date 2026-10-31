import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, ChevronRight, PenLine, Search } from 'lucide-react'
import { Avatar, BrandMark, NetIcon, cn } from '../ui'
import { canOpen, can, roleName } from '../../data/permissions'
import { routes } from '../../data/routes'
import { brandsFor } from '../../data/scope'
import { NETWORK_LABEL, NETWORK_ORDER } from '../../data/selectors'
import { useWorkspace } from '../../data/store'
import type { NetworkId } from '../../data/types'
import { useI18n } from '../../i18n'

interface Option {
  group: string
  label: string
  meta: string
  lead: ReactNode
  /** Where it goes, or what it does. */
  href?: string
  run?: () => void
}

const leadIcon = (Icon: LucideIcon) => <Icon size={20} aria-hidden />

/** The query's first match in the label, marked. */
function Marked({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-butter/70 px-px text-inherit">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  )
}

/**
 * ⌘K / "/" (the dock's Search, the phone's search button): pages first, then
 * posts, conversations, people, brands and networks matching what's typed.
 * Arrow keys move, Enter goes, Esc closes.
 */
export function Finder({ open, onClose, onOpenPost }: { open: boolean; onClose: () => void; onOpenPost: (id: string) => void }) {
  const { t } = useI18n()
  const { ws, all, dispatch } = useWorkspace()
  const f = t.finder
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(0)
  const me = ws.currentUserId

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      setQuery('')
      setSel(0)
      d.showModal()
      input.current?.focus()
    }
    if (!open && d.open) d.close()
  }, [open])

  const options = useMemo<Option[]>(() => {
    const q = query.trim().toLowerCase()
    const out: Option[] = []
    routes
      .filter((r) => canOpen(ws, me, r.id) && (!q || t.routes[r.id].label.toLowerCase().includes(q)))
      .slice(0, q ? 8 : 5)
      .forEach((r) => out.push({ group: f.groups.pages, label: t.routes[r.id].label, meta: f.goTo, href: r.path, lead: leadIcon(ArrowRight) }))
    if (!q) {
      if (can(ws, me, 'post.create')) out.push({ group: f.groups.actions, label: f.write, meta: f.writeMeta, href: '#/compose', lead: leadIcon(PenLine) })
      return out
    }
    ws.posts
      .filter((p) => p.text.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((p) =>
        out.push({
          group: f.groups.posts,
          label: p.text.slice(0, 70),
          meta: f.postMeta(ws.brands.find((b) => b.id === p.brandId)?.name ?? '', t.status[p.status], t.dates.monthDay(new Date(p.scheduledAt))),
          lead: <NetIcon network={p.networks[0] ?? 'instagram'} size="sm" />,
          run: () => onOpenPost(p.id),
        }),
      )
    if (canOpen(ws, me, 'inbox'))
      ws.conversations
        .filter((c) => `${c.contact.name} ${c.messages.map((m) => m.text).join(' ')}`.toLowerCase().includes(q))
        .slice(0, 4)
        .forEach((c) =>
          out.push({
            group: f.groups.conversations,
            label: c.contact.name,
            meta: `${NETWORK_LABEL[c.network]} · ${(c.messages[c.messages.length - 1]?.text ?? '').slice(0, 48)}`,
            href: `#/inbox/${c.id}`,
            lead: <Avatar src={c.contact.avatar} name={c.contact.name} size="fill" />,
          }),
        )
    ws.team
      .filter((m) => `${m.name} ${m.email} ${m.title ?? ''}`.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((m) =>
        out.push({
          group: f.groups.people,
          label: m.name,
          meta: f.personMeta(roleName(t, ws, m.role), m.title ?? ''),
          href: `#/team/${m.id}`,
          lead: <Avatar src={m.avatar} name={m.name} size="fill" />,
        }),
      )
    brandsFor(all)
      .filter((b) => b.name.toLowerCase().includes(q))
      .forEach((b) =>
        out.push({
          group: f.groups.brands,
          label: b.name,
          meta: b.industry,
          lead: <BrandMark brand={b} size="md" />,
          run: () => {
            dispatch({ type: 'scope', brandId: b.id })
          },
        }),
      )
    ;(NETWORK_ORDER as NetworkId[])
      .filter((n) => NETWORK_LABEL[n].toLowerCase().includes(q))
      .slice(0, 2)
      .forEach((n) =>
        out.push({
          group: f.groups.channels,
          label: NETWORK_LABEL[n],
          meta: f.connected(ws.channels.filter((c) => c.network === n).length),
          href: '#/channels',
          lead: <NetIcon network={n} size="sm" />,
        }),
      )
    return out
  }, [query, ws, all, me, t, f, dispatch, onOpenPost])

  const current = Math.min(sel, Math.max(0, options.length - 1))
  const go = (o: Option | undefined) => {
    if (!o) return
    onClose()
    if (o.run) window.setTimeout(o.run, 0)
    else if (o.href) window.location.hash = o.href
  }

  useEffect(() => {
    list.current?.querySelector(`#fo-${current}`)?.scrollIntoView({ block: 'nearest' })
  }, [current])

  let lastGroup = ''
  return (
    <dialog
      ref={ref}
      aria-label={f.label}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="mx-auto mb-auto mt-[12vh] w-[min(640px,calc(100vw-24px))] max-w-[calc(100%-38px)] overflow-hidden rounded-[24px] border border-rim bg-solid p-0 text-text shadow-pop backdrop:bg-[rgb(16_18_20/0.26)] backdrop:backdrop-blur-[6px] open:animate-rise dark:backdrop:bg-black/60"
    >
      <div className="flex items-center gap-3 border-b border-line px-[18px] py-4">
        <Search size={20} aria-hidden className="shrink-0" />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="finder-list"
          aria-autocomplete="list"
          aria-activedescendant={options.length ? `fo-${current}` : undefined}
          placeholder={f.placeholder}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSel(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              const n = Math.max(1, options.length)
              setSel((current + (e.key === 'ArrowDown' ? 1 : -1) + n) % n)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              go(options[current])
            }
          }}
          className="min-w-0 flex-1 bg-transparent px-0.5 py-px text-[18px] outline-none placeholder:text-muted"
        />
        <kbd className="rounded-lg border border-line-2 bg-glass-2 px-[7px] py-[3px] font-[inherit] text-[12px] text-muted pointer-coarse:hidden">{f.esc}</kbd>
      </div>
      <ul ref={list} id="finder-list" role="listbox" aria-label={f.results} className="max-h-[52vh] overflow-auto p-2">
        {options.length ? (
          options.map((o, i) => {
            const head = o.group !== lastGroup
            lastGroup = o.group
            return [
              head && (
                <li key={`g-${o.group}`} role="presentation" className="px-2.5 pb-1 pt-2.5 text-[12.5px] font-bold uppercase tracking-[0.06em] text-muted">
                  {o.group}
                </li>
              ),
              <li
                key={`o-${i}`}
                id={`fo-${i}`}
                role="option"
                aria-selected={i === current}
                onPointerMove={() => i !== current && setSel(i)}
                onClick={() => go(o)}
                className={cn('flex cursor-pointer items-center gap-3 rounded-[14px] px-2.5 py-[9px]', i === current && 'bg-well')}
              >
                <span className="grid size-[38px] shrink-0 place-items-center overflow-hidden rounded-full bg-well">{o.lead}</span>
                <span className="min-w-0">
                  <b className="block font-semibold">
                    <Marked text={o.label} query={query.trim()} />
                  </b>
                  <small className="block text-2xs text-muted">{o.meta}</small>
                </span>
                <ChevronRight size={20} aria-hidden className="ml-auto shrink-0 text-muted" />
              </li>,
            ]
          })
        ) : (
          <li role="presentation" className="grid justify-items-center gap-1.5 px-4 py-9 text-center text-muted">
            <Search size={30} aria-hidden className="opacity-70" />
            <p className="font-semibold text-text">{f.none(query.trim())}</p>
            <p className="text-xs">{f.noneText}</p>
          </li>
        )}
      </ul>
    </dialog>
  )
}
