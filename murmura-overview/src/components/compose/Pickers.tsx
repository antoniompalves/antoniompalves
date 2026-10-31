import type { RefObject } from 'react'
import { FileText, Folder, Hash, Image as ImageIcon, Star } from 'lucide-react'
import { Empty } from '../analytics/parts'
import { Popover } from '../Popover'
import { Button, cn } from '../ui'
import { photo } from '../../data/assets'
import type { HashtagSet, MediaAsset, Template } from '../../data/types'
import { useI18n } from '../../i18n'

interface PickerProps {
  open: boolean
  onClose: () => void
  anchor: RefObject<HTMLButtonElement | null>
}

const head = 'flex items-baseline justify-between gap-3 px-2 pb-2 pt-1.5'
const title = 'text-sm font-semibold'

/** "Media": the brand's library as a 3-column grid; picks are numbered in posting order. */
export function MediaPicker({ open, onClose, anchor, brand, assets, picked, onToggle }: PickerProps & { brand: string; assets: MediaAsset[]; picked: string[]; onToggle: (seed: string) => void }) {
  const { t } = useI18n()
  const p = t.compose.pickers
  return (
    <Popover open={open} onClose={onClose} anchor={anchor} label={p.library(brand)} className="w-[min(380px,calc(100vw-24px))]">
      <div className={head}>
        <span className={title}>{p.library(brand)}</span>
        {picked.length > 0 && <span className="text-2xs text-muted">{p.selected(picked.length)}</span>}
      </div>
      {assets.length ? (
        <div role="group" aria-label={p.library(brand)} className="grid grid-cols-3 gap-1.5 px-1.5 py-1">
          {assets.map((a) => {
            const n = picked.indexOf(a.seed) + 1
            return (
              <button
                key={a.seed}
                type="button"
                aria-pressed={n > 0}
                aria-label={a.title}
                title={a.title}
                onClick={() => onToggle(a.seed)}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-[14px] bg-well after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_3px_var(--text)] after:opacity-0 aria-pressed:after:opacity-100"
              >
                <img src={photo(a.seed, 240)} alt="" loading="lazy" decoding="async" className={cn('size-full object-cover', n > 0 && 'opacity-82')} />
                <span
                  aria-hidden
                  className={cn(
                    'absolute right-[7px] top-[7px] grid size-6 place-items-center rounded-full border-2 text-[12.5px] font-bold',
                    n > 0 ? 'border-butter bg-butter text-[#16191d]' : 'border-[#f6f7f5] bg-[#16191d]/32 text-[#f6f7f5]',
                  )}
                >
                  {n > 0 ? n : ''}
                </span>
                {a.starred && <Star size={16} aria-hidden className="absolute bottom-[7px] left-[7px] fill-butter text-butter" />}
              </button>
            )
          })}
        </div>
      ) : (
        <Empty icon={ImageIcon} title={p.noMedia(brand)} text={p.noMediaText} />
      )}
      <div className="flex items-center justify-between gap-2 px-1.5 pb-1 pt-2.5">
        <Button variant="ghost" size="sm" icon={Folder} href="#/library">
          {p.openLibrary}
        </Button>
        <Button size="sm" onClick={onClose}>
          {p.done}
        </Button>
      </div>
    </Popover>
  )
}

const row = 'grid w-full cursor-pointer gap-0.5 rounded-xl px-3 py-2.5 text-left outline-none hover:bg-well focus-visible:bg-well pointer-coarse:min-h-[46px]'

/** "Hashtags": the brand's sets, each added in one tap. */
export function HashtagPicker({ open, onClose, anchor, sets, suggested, onPick }: PickerProps & { sets: HashtagSet[]; suggested: string[]; onPick: (name: string, tags: string[]) => void }) {
  const { t } = useI18n()
  const p = t.compose.pickers
  return (
    <Popover open={open} onClose={onClose} anchor={anchor} label={p.hashtags} className="w-[min(340px,calc(100vw-24px))]">
      <div className={head}>
        <span className={title}>{p.hashtags}</span>
      </div>
      {sets.length ? (
        <div role="menu" aria-label={p.hashtags}>
          {sets.map((s) => (
            <button key={s.id} type="button" role="menuitem" className={row} onClick={() => onPick(s.name, s.tags)}>
              <b className="text-xs font-semibold">{s.name}</b>
              <small className="line-clamp-2 text-2xs text-muted">{s.tags.join(' ')}</small>
            </button>
          ))}
        </div>
      ) : (
        <>
          <Empty icon={Hash} title={p.noSets} text={p.noSetsText} />
          <button type="button" className={row} onClick={() => onPick(p.suggested, suggested)}>
            <b className="text-xs font-semibold">{p.suggested}</b>
            <small className="line-clamp-2 text-2xs text-muted">{suggested.join(' ')}</small>
          </button>
        </>
      )}
    </Popover>
  )
}

/** "Template": captions to start from; braces mark what to fill in. */
export function TemplatePicker({ open, onClose, anchor, templates, onPick }: PickerProps & { templates: Template[]; onPick: (tpl: Template) => void }) {
  const { t } = useI18n()
  const p = t.compose.pickers
  return (
    <Popover open={open} onClose={onClose} anchor={anchor} label={p.templates} className="w-[min(360px,calc(100vw-24px))]">
      <div className={head}>
        <span className={title}>{p.templates}</span>
        <span className="text-2xs text-muted">{p.templateHint}</span>
      </div>
      {templates.length ? (
        <div role="menu" aria-label={p.templates}>
          {templates.map((tpl) => (
            <button key={tpl.id} type="button" role="menuitem" className={row} onClick={() => onPick(tpl)}>
              <b className="text-xs font-semibold">{tpl.name}</b>
              <small className="line-clamp-2 whitespace-pre-line text-2xs text-muted">{tpl.text}</small>
            </button>
          ))}
        </div>
      ) : (
        <Empty icon={FileText} title={p.noTemplates} text={p.noTemplatesText} />
      )}
    </Popover>
  )
}
