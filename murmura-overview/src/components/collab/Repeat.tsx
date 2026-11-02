import { useState } from 'react'
import { MessageSquare, Plus, Repeat, X } from 'lucide-react'
import { Badge, Button, IconButton, Segmented, cn } from '../ui'
import type { Post, PostVersion, RepeatRule } from '../../data/types'
import { occurrenceAt } from '../../data/workflow'
import { useI18n } from '../../i18n'
import { PostNotes, Versions } from './Notes'

const card = 'min-w-0 rounded-card border border-rim bg-glass p-5 shadow-card max-mobile:p-4'
const select = 'h-[42px] w-full min-w-0 rounded-[14px] border border-line-2 bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text'

/**
 * "Repeat" in the composer: how often and how many times, with alternative
 * texts that take turns. Saving makes one post per time, linked as a series.
 */
export function RepeatCard({ rule, onRule, at }: { rule: RepeatRule | null; onRule: (r: RepeatRule | null) => void; at: number }) {
  const { t } = useI18n()
  const r = t.collab.repeat
  const dates = rule ? Array.from({ length: rule.count }, (_, k) => occurrenceAt(at, rule, k)) : []
  const set = (patch: Partial<RepeatRule>) => onRule({ ...(rule ?? { every: 'week', count: 4, variations: [] }), ...patch })
  return (
    <section aria-labelledby="cm-rep-t" className={cn(card, '[grid-area:rep]')}>
      <h2 id="cm-rep-t" className="mb-3 flex items-center gap-2 text-base font-semibold tracking-[-0.005em]">
        <Repeat size={18} aria-hidden />
        {r.title}
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2.5">
        <label className="grid gap-1.5">
          <span className="px-0.5 text-2xs font-semibold text-muted">{r.how}</span>
          <select value={rule?.every ?? ''} onChange={(e) => (e.target.value ? set({ every: e.target.value as RepeatRule['every'] }) : onRule(null))} className={select}>
            <option value="">{r.none}</option>
            {(['week', '2weeks', 'month'] as const).map((k) => (
              <option key={k} value={k}>
                {r.every[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="px-0.5 text-2xs font-semibold text-muted">{r.times}</span>
          <input type="number" min={2} max={26} disabled={!rule} value={rule?.count ?? 4} onChange={(e) => set({ count: Math.min(26, Math.max(2, Number(e.target.value) || 2)) })} className={cn(select, 'disabled:opacity-50')} />
        </label>
      </div>
      {rule && (
        <div className="mt-3 grid gap-2.5">
          <p className="flex flex-wrap gap-1.5" aria-label={r.dates}>
            {dates.slice(0, 6).map((d, k) => (
              <Badge key={d} tone={k === 0 ? 'ink' : 'plain'} size="tight">
                {t.dates.monthDay(new Date(d))}
              </Badge>
            ))}
            {dates.length > 6 && (
              <Badge tone="plain" size="tight">
                {r.more(dates.length - 6)}
              </Badge>
            )}
          </p>
          <div className="grid gap-2">
            <span className="text-2xs font-semibold text-muted">{r.variations}</span>
            <small className="-mt-1.5 text-[12.5px] text-muted">{r.variationsHint}</small>
            {rule.variations.map((v, i) => (
              <span key={i} className="flex items-start gap-1.5">
                <textarea
                  aria-label={r.variation(i + 1)}
                  placeholder={r.variation(i + 1)}
                  value={v}
                  rows={2}
                  onChange={(e) => set({ variations: rule.variations.map((x, j) => (j === i ? e.target.value : x)) })}
                  className="min-w-0 flex-1 resize-y rounded-[14px] border border-line-2 bg-glass-2 px-3 py-2 text-xs text-text outline-none focus-visible:border-text"
                />
                <IconButton label={r.remove(i + 1)} icon={X} size="sm" onClick={() => set({ variations: rule.variations.filter((_, j) => j !== i) })} />
              </span>
            ))}
            {rule.variations.length < 6 && (
              <Button size="sm" variant="ghost" icon={Plus} onClick={() => set({ variations: [...rule.variations, ''] })} className="w-fit">
                {r.addVariation}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

/** Notes and versions of a saved post, next to the composer. */
export function CollabCard({ post, now, onRestore }: { post: Post; now: Date; onRestore: (v: PostVersion) => void }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'notes' | 'versions'>('notes')
  const open = (post.comments ?? []).filter((c) => !c.resolved).length
  return (
    <section aria-labelledby="cm-co-t" className={cn(card, '[grid-area:co]')}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="cm-co-t" className="flex items-center gap-2 text-base font-semibold tracking-[-0.005em]">
          <MessageSquare size={18} aria-hidden />
          {tab === 'notes' ? t.collab.notes.title : t.collab.versions.title}
        </h2>
        <Segmented
          label={t.collab.notes.title}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'notes', label: open ? `${t.collab.notes.title} · ${open}` : t.collab.notes.title },
            { value: 'versions', label: `${t.collab.versions.title}${post.history?.length ? ` · ${post.history.length}` : ''}` },
          ]}
        />
      </header>
      {tab === 'notes' ? <PostNotes post={post} now={now} /> : <Versions post={post} now={now} onRestore={post.status === 'published' ? undefined : onRestore} />}
    </section>
  )
}
