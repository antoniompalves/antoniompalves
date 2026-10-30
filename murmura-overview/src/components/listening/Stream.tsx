import { useRef, useState } from 'react'
import { ChevronDown, Ear, Eye, EyeOff, Globe, Reply, Search, Star, X } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { Empty } from '../analytics/parts'
import { MenuItem, Popover } from '../Popover'
import { Avatar, Button, IconButton, NetIcon, Segmented, StatusPill, cn, toneFill } from '../ui'
import { KIND_TONE, SENTIMENTS, SENTIMENT_TONE, isFiltered, mentionText } from '../../data/listening'
import type { StreamFilters } from '../../data/listening'
import { splitMatches } from '../../data/inbox'
import { NETWORK_LABEL } from '../../data/selectors'
import type { Keyword, Mention, NetworkId } from '../../data/types'
import { useI18n } from '../../i18n'

/** Count pill inside a chip or button (".ls-n"). */
export const Count = ({ n, on }: { n: number; on?: boolean }) => (
  <span className={cn('inline-grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[12.5px] font-bold', on ? 'bg-white/16 dark:bg-black/10' : 'bg-well')}>{n}</span>
)

/** Filter chip of the stream (".ls-fchip"): ink when on. */
export function StreamChip({ on, className, children, ...rest }: { on?: boolean } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-[34px] shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full border px-[13px] text-2xs font-semibold transition-colors duration-200 pointer-coarse:h-11 pointer-coarse:px-3.5 [&>svg:last-child:not(:first-child)]:size-3.5 [&>svg:last-child:not(:first-child)]:opacity-60',
        on ? 'border-transparent bg-pill text-on-pill' : 'border-rim bg-glass-2 text-text hover:bg-glass-3',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/** "Live" / "Paused" switch in the card header (".ls-live"): coral with a beating dot while new mentions flow in. */
export function LiveToggle({ live, onToggle }: { live: boolean; onToggle: () => void }) {
  const { t } = useI18n()
  const s = t.listening.stream
  return (
    <button
      type="button"
      aria-pressed={live}
      title={live ? s.pause : s.resume}
      onClick={onToggle}
      className={cn(
        'inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-full pl-[11px] pr-[13px] text-2xs font-bold pointer-coarse:h-11',
        live ? 'bg-coral/14 text-bad' : 'bg-well text-muted',
      )}
    >
      <i aria-hidden className={cn('size-[9px] rounded-full', live ? 'animate-beat bg-coral' : 'bg-faint')} />
      <span>{live ? s.live : s.paused}</span>
    </button>
  )
}

/** Text of a mention with the keyword (or the searched term) marked. */
function Marked({ text, needle }: { text: string; needle: string }) {
  return splitMatches(text, needle).map((part, i) =>
    part.hit ? (
      <mark key={i} className="bg-butter text-[#16191d]">
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  )
}

interface StreamProps {
  mentions: Mention[]
  /** How many of them are listed. */
  shown: number
  pageSize: number
  onMore: () => void
  /** The mention that just arrived live, lit up for a moment. */
  fresh: string | null
  keywords: Map<string, Keyword>
  filters: StreamFilters
  onFilters: (f: Partial<StreamFilters>) => void
  onClear: () => void
  networks: NetworkId[]
  savedCount: number
  now: Date
  onReply: (m: Mention) => void
  onSave: (m: Mention) => void
  onHide: (m: Mention) => void
}

/** "Mentions": sentiment, network and saved filters, the active keyword / term, then the stream. */
export function Stream(props: StreamProps) {
  const { mentions, shown, pageSize, fresh, keywords, filters, onFilters, networks, now } = props
  const { t } = useI18n()
  const s = t.listening.stream
  const netBtn = useRef<HTMLButtonElement>(null)
  const [netOpen, setNetOpen] = useState(false)
  const keyword = filters.keywordId ? keywords.get(filters.keywordId) : undefined
  const list = mentions.slice(0, shown)
  const rest = mentions.length - list.length

  const pickNetwork = (network: NetworkId | null) => {
    setNetOpen(false)
    onFilters({ network })
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 max-mobile:[&>[role=group]]:flex max-mobile:[&>[role=group]]:w-full max-mobile:[&_[role=group]>button]:flex-1 max-mobile:[&_[role=group]>button]:px-1.5">
        <Segmented
          label={s.sentiment}
          value={filters.sentiment}
          onChange={(sentiment) => onFilters({ sentiment })}
          options={[{ value: 'all' as const, label: s.all }, ...SENTIMENTS.map((v) => ({ value: v, label: t.sentiment[v] }))]}
        />
        <StreamChip ref={netBtn} on={!!filters.network} aria-haspopup="menu" aria-expanded={netOpen} onClick={() => setNetOpen((o) => !o)}>
          {filters.network ? <NetIcon network={filters.network} surface="on-pill" /> : <Globe size={18} aria-hidden />}
          {filters.network ? NETWORK_LABEL[filters.network] : s.allNetworks}
          <ChevronDown aria-hidden />
        </StreamChip>
        <Popover open={netOpen} onClose={() => setNetOpen(false)} anchor={netBtn} label={s.network}>
          <div role="menu" aria-label={s.network}>
            <MenuItem icon={Globe} checked={!filters.network} onClick={() => pickNetwork(null)}>
              {s.allNetworks}
            </MenuItem>
            {networks.map((n) => (
              <MenuItem key={n} lead={<NetIcon network={n} />} checked={filters.network === n} onClick={() => pickNetwork(n)}>
                {NETWORK_LABEL[n]}
              </MenuItem>
            ))}
          </div>
        </Popover>
        <StreamChip on={filters.savedOnly} aria-pressed={filters.savedOnly} onClick={() => onFilters({ savedOnly: !filters.savedOnly })}>
          <Star size={18} aria-hidden />
          {s.saved}
          <Count n={props.savedCount} on={filters.savedOnly} />
        </StreamChip>
      </div>

      {(keyword || filters.term) && (
        <div role="group" aria-label={s.activeFilters} className="mt-2.5 flex flex-wrap gap-2">
          {keyword && (
            <ActiveChip icon={<Ear size={15} aria-hidden />} label={s.clearKeyword(keyword.term)} onClick={() => onFilters({ keywordId: null })}>
              {keyword.term}
            </ActiveChip>
          )}
          {filters.term && (
            <ActiveChip icon={<Search size={15} aria-hidden />} label={s.clearTerm(filters.term)} onClick={() => onFilters({ term: null })}>
              “{filters.term}”
            </ActiveChip>
          )}
        </div>
      )}

      <ol aria-live="polite" className="mt-2 grid">
        {list.length ? (
          list.map((m) => (
            <MentionItem
              key={m.id}
              mention={m}
              keyword={keywords.get(m.keywordId)}
              term={filters.term}
              fresh={m.id === fresh}
              now={now}
              onReply={props.onReply}
              onSave={props.onSave}
              onHide={props.onHide}
            />
          ))
        ) : (
          <li className="py-[18px]">
            {isFiltered(filters) ? (
              <div className="grid justify-items-center">
                <Empty icon={Ear} title={s.noMatchTitle} text={filters.savedOnly ? s.noSaved : s.noMatchText} />
                <Button variant="ghost" size="sm" onClick={props.onClear} className="-mt-2">
                  {t.common.clearFilters}
                </Button>
              </div>
            ) : (
              <Empty icon={Ear} title={s.noneTitle} text={s.noneText} />
            )}
          </li>
        )}
      </ol>

      {rest > 0 ? (
        <div className="mt-2.5 grid justify-items-center">
          <Button variant="ghost" onClick={props.onMore}>
            {s.more(Math.min(pageSize, rest))}
            <Count n={rest} />
          </Button>
        </div>
      ) : (
        mentions.length > pageSize && <p className="mt-2.5 text-center text-2xs text-muted">{s.everything}</p>
      )}
    </>
  )
}

function ActiveChip({ icon, label, onClick, children }: { icon: ReactNode; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-full bg-butter px-[13px] text-2xs font-semibold text-[#16191d] pointer-coarse:h-11 pointer-coarse:px-3.5"
    >
      {icon}
      {children}
      <X size={15} aria-hidden />
    </button>
  )
}

function MentionItem({
  mention: m,
  keyword,
  term,
  fresh,
  now,
  onReply,
  onSave,
  onHide,
}: { mention: Mention; keyword: Keyword | undefined; term: string | null; fresh: boolean } & Pick<StreamProps, 'now' | 'onReply' | 'onSave' | 'onHide'>) {
  const { t } = useI18n()
  const s = t.listening.stream
  return (
    <li
      className={cn(
        'grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-line px-1 py-3.5 last:border-b-0 max-mobile:gap-2.5 max-mobile:px-0 max-mobile:py-3',
        fresh ? 'animate-rise rounded-2xl bg-[linear-gradient(90deg,color-mix(in_srgb,var(--butter)_26%,transparent),transparent_70%)]' : 'rounded-[4px]',
      )}
    >
      <span className="relative h-9 self-start">
        <Avatar src={m.avatar} name={m.author} />
        <NetIcon network={m.network} size="2xs" surface="stack" className="absolute -bottom-1 -right-1.5" />
      </span>
      <div className="grid min-w-0 gap-1.5">
        <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <b className="text-sm font-bold">{m.author}</b>
          <small className="text-[12.5px] text-muted">
            @{m.handle} · <time dateTime={m.at}>{t.dates.ago(m.at, now)}</time>
          </small>
          <StatusPill tone={SENTIMENT_TONE[m.sentiment]} size="md" className="ml-auto max-mobile:ml-0">
            {t.sentiment[m.sentiment]}
          </StatusPill>
        </header>
        <p className="text-md leading-[1.45]">
          <Marked text={mentionText(m, keyword)} needle={term ?? keyword?.term ?? ''} />
        </p>
        <footer className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12.5px] text-muted">
          {keyword && (
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <i aria-hidden className={cn('size-2 rounded-full', toneFill[KIND_TONE[keyword.kind]])} />
              {keyword.term}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Eye size={15} aria-hidden />
            {s.reach(t.numbers.compact(m.reach))}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 max-mobile:ml-0 max-mobile:w-full max-mobile:[&>button:first-child]:flex-1">
            <Button variant="ghost" size="sm" icon={Reply} onClick={() => onReply(m)}>
              {m.conversationId ? s.openInInbox : s.reply}
            </Button>
            <IconButton
              label={m.saved ? s.unsave : s.save}
              icon={Star}
              size="sm"
              aria-pressed={!!m.saved}
              onClick={() => onSave(m)}
              className="aria-pressed:border-transparent aria-pressed:bg-butter aria-pressed:text-[#16191d] aria-pressed:[&_svg]:fill-current"
            />
            <IconButton label={s.hide} icon={EyeOff} size="sm" onClick={() => onHide(m)} />
          </span>
        </footer>
      </div>
    </li>
  )
}
