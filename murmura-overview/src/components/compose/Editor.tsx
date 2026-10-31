import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, FileText, Hash, Image as ImageIcon, Layers, Lock, Plus, Sparkles, Undo2, X } from 'lucide-react'
import { MenuDivider, MenuItem, Popover } from '../Popover'
import { BrandMark, Button, NetIcon, NetworkGlyph, cn } from '../ui'
import { HashtagPicker, MediaPicker, TemplatePicker } from './Pickers'
import { ASSIST_ACTIONS, MAX_MEDIA, NETWORK_SPEC, charsLeft } from '../../data/compose'
import type { AssistAction, Draft, Issue } from '../../data/compose'
import { photo } from '../../data/assets'
import { NETWORK_LABEL } from '../../data/selectors'
import type { Brand, Campaign, Channel, HashtagSet, MediaAsset, NetworkId, Template } from '../../data/types'
import { useI18n } from '../../i18n'
import type { Messages } from '../../i18n'

const ICON = 'size-[18px]'

/** Characters left on one network (".cm-ring"): a 32px dial that turns butter near the limit and coral past it. */
function Ring({ network, text }: { network: NetworkId; text: string }) {
  const { t } = useI18n()
  const limit = NETWORK_SPEC[network].limit
  const left = charsLeft(network, text)
  const used = Math.min(1, Math.max(0, (limit - left) / limit))
  const C = 2 * Math.PI * 15
  const near = left >= 0 && used >= 0.8
  const label = left < 0 ? `−${t.numbers.int(-left)}` : left >= 10_000 ? t.numbers.compact(left) : t.numbers.int(left)
  return (
    <li
      title={left < 0 ? t.compose.editor.over(NETWORK_LABEL[network], t.numbers.int(-left)) : t.compose.editor.left(NETWORK_LABEL[network], t.numbers.int(left), t.numbers.int(limit))}
      className={cn('inline-flex items-center gap-1.5 text-2xs font-bold tabular-nums', left < 0 ? 'text-bad' : near ? 'text-warn' : 'text-muted')}
    >
      <span className="relative grid size-8 place-items-center max-mobile:size-7">
        <svg viewBox="0 0 36 36" aria-hidden className="absolute inset-0 size-full -rotate-90">
          <circle cx="18" cy="18" r="15" className="fill-none stroke-line-2 [stroke-width:3]" />
          <circle
            cx="18"
            cy="18"
            r="15"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - used)}
            className={cn(
              'fill-none [stroke-linecap:round] [stroke-width:3] transition-[stroke-dashoffset,stroke] duration-300 ease-soft',
              left < 0 ? 'stroke-coral' : near ? 'stroke-butter' : 'stroke-text',
            )}
          />
        </svg>
        <span className="relative grid" style={{ color: `var(--n-${network})` }}>
          <NetworkGlyph network={network} className="size-3.5 stroke-2" />
        </span>
      </span>
      <b className="font-bold">{label}</b>
    </li>
  )
}

/** What an issue says, in the interface language. */
export function issueText(t: Messages, issue: Issue) {
  const i = t.compose.issues
  switch (issue.kind) {
    case 'noChannel':
      return i.noChannel
    case 'empty':
      return i.empty
    case 'past':
      return i.past
    case 'link':
      return i.link
    case 'over':
      return i.over(t.numbers.int(issue.by), NETWORK_LABEL[issue.network])
    case 'needsPhoto':
      return i.needsPhoto(NETWORK_LABEL[issue.network])
    case 'needsVideo':
      return i.needsVideo(NETWORK_LABEL[issue.network])
    case 'expires':
      return i.expires(NETWORK_LABEL[issue.network], issue.days)
    case 'ready':
      return i.ready(issue.networks)
  }
}

/** A blocking issue, a warning or the all-clear (".cm-prob"). */
function IssueChip({ issue }: { issue: Issue }) {
  const { t } = useI18n()
  const net = 'network' in issue ? issue.network : null
  const text = issueText(t, issue)
  const tone = issue.kind === 'ready' ? 'pine' : issue.kind === 'expires' ? 'butter' : issue.kind === 'empty' ? 'plain' : 'coral'
  return (
    <li
      className={cn(
        'inline-flex h-[34px] items-center gap-2 rounded-full pl-[7px] pr-[13px] text-2xs font-semibold',
        tone === 'pine' && 'bg-good/13 text-good',
        tone === 'butter' && 'bg-butter/20 text-warn',
        tone === 'coral' && 'bg-well text-bad',
        tone === 'plain' && 'bg-well',
      )}
    >
      {tone === 'pine' ? (
        <Check size={16} aria-hidden className="ml-1" />
      ) : net ? (
        <NetIcon network={net} size="xs" surface="chip" />
      ) : (
        <i aria-hidden className={cn('mx-1 ml-1.5 size-2 rounded-full', tone === 'coral' ? 'bg-coral' : 'bg-faint')} />
      )}
      {text}
    </li>
  )
}

interface EditorProps {
  title: string
  titleExtra?: ReactNode
  notes?: ReactNode
  brands: Brand[]
  brand: Brand
  onBrand: (id: string) => void
  channels: Channel[]
  canFixChannels: boolean
  draft: Draft
  onChange: (patch: Partial<Draft>) => void
  readOnly: boolean
  nets: NetworkId[]
  issues: Issue[]
  /** Bumped to shake the box after a refused action. */
  shake: number
  media: MediaAsset[]
  hashtagSets: HashtagSet[]
  suggestedTags: string[]
  templates: Template[]
  campaigns: Campaign[]
  link: string
  onAssist: (action: AssistAction) => void
  undoLabel: string | null
  onUndoAssist: () => void
  onHashtags: (name: string, tags: string[]) => void
  onTemplate: (tpl: Template) => void
  onRemovePhoto: (seed: string) => void
  onCopyLink: () => void
  onInsertLink: () => void
}

/** "New post" / "Edit post": brand, channels, the text box with photos and tools, character dials, issues and extra options. */
export function Editor(props: EditorProps) {
  const { draft, onChange, readOnly, brand, channels, nets } = props
  const { t } = useI18n()
  const e = t.compose.editor
  const [menu, setMenu] = useState<'brand' | 'media' | 'tags' | 'template' | 'assist' | null>(null)
  const [extras, setExtras] = useState(false)
  const brandBtn = useRef<HTMLButtonElement>(null)
  const mediaBtn = useRef<HTMLButtonElement>(null)
  const tagsBtn = useRef<HTMLButtonElement>(null)
  const tplBtn = useRef<HTMLButtonElement>(null)
  const assistBtn = useRef<HTMLButtonElement>(null)
  const live = channels.filter((c) => c.status !== 'disconnected')
  const hasIg = nets.includes('instagram')
  const close = () => setMenu(null)
  const toggle = (m: NonNullable<typeof menu>) => setMenu((cur) => (cur === m ? null : m))

  const togglePhoto = (seed: string) => {
    if (draft.media.includes(seed)) onChange({ media: draft.media.filter((s) => s !== seed) })
    else if (draft.media.length < MAX_MEDIA) onChange({ media: [...draft.media, seed] })
  }
  const move = (i: number, by: -1 | 1) => {
    const media = [...draft.media]
    ;[media[i], media[i + by]] = [media[i + by], media[i]]
    onChange({ media })
  }

  const extrasSummary = [draft.firstComment.trim() && hasIg ? e.firstComment : '', draft.link.trim() ? e.link : '', props.campaigns.find((c) => c.id === draft.campaignId)?.name ?? ''].filter(Boolean)

  const tool =
    'inline-flex h-10 cursor-pointer items-center gap-[7px] rounded-full px-[13px] text-2xs font-semibold aria-expanded:bg-well hover:bg-well disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:min-h-11 pointer-coarse:min-w-11 max-mobile:px-[11px]'
  const label = 'text-2xs font-semibold text-muted'
  const field = 'w-full rounded-[14px] border border-line-2 bg-glass-2 px-3 py-2.5 text-sm text-text outline-none focus-visible:border-text disabled:cursor-not-allowed disabled:opacity-55'

  return (
    <section aria-labelledby="cm-ed-t" className="rounded-card border border-rim bg-glass p-5 shadow-card [grid-area:ed] max-mobile:p-4">
      <header className="mb-3.5 flex min-h-[42px] flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 id="cm-ed-t" className="text-[22px] font-bold tracking-[-0.02em] max-mobile:text-xl">
            {props.title}
          </h2>
          {props.titleExtra}
        </div>
        <button
          ref={brandBtn}
          type="button"
          disabled={readOnly || props.brands.length < 2}
          aria-haspopup="menu"
          aria-expanded={menu === 'brand'}
          aria-label={`${e.brand}: ${brand.name}`}
          onClick={() => toggle('brand')}
          className="group inline-flex h-[50px] min-w-0 max-w-[280px] cursor-pointer items-center gap-2.5 rounded-full border border-rim bg-glass-2 pl-1.5 pr-3.5 text-left enabled:hover:bg-glass-3 disabled:cursor-default max-mobile:h-[46px] max-mobile:max-w-[220px]"
        >
          <BrandMark brand={brand} size="md" />
          <span className="grid min-w-0 leading-[1.15]">
            <small className="text-[12.5px] font-semibold text-muted max-mobile:hidden">{e.brand}</small>
            <b className="truncate text-sm font-bold">{brand.name}</b>
          </span>
          <ChevronDown size={16} aria-hidden className="text-muted group-disabled:hidden" />
        </button>
        <Popover open={menu === 'brand'} onClose={close} anchor={brandBtn} placement="bottom-end" label={e.pickBrand}>
          <div role="menu" aria-label={e.pickBrand}>
            {props.brands.map((b) => (
              <MenuItem
                key={b.id}
                lead={<BrandMark brand={b} size="xs" />}
                checked={b.id === brand.id}
                onClick={() => {
                  close()
                  props.onBrand(b.id)
                }}
              >
                {b.name}
              </MenuItem>
            ))}
          </div>
        </Popover>
      </header>

      {props.notes && <div className="mb-4 grid gap-2">{props.notes}</div>}

      <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
        <div className="mb-4 grid gap-[9px]">
          <span className={label}>
            {e.postTo} <span className="font-medium text-faint">· {e.picked(draft.channels.length, live.length)}</span>
          </span>
          {channels.length ? (
            <div className="flex flex-wrap gap-2">
              {channels.map((c) => {
                const on = draft.channels.includes(c.id)
                const dead = c.status === 'disconnected'
                return dead ? (
                  <span
                    key={c.id}
                    title={e.disconnected(NETWORK_LABEL[c.network])}
                    className="inline-flex h-[42px] min-w-0 items-center gap-2 rounded-full border-[1.5px] border-dashed border-line-2 pl-1.5 pr-1.5 text-2xs font-semibold text-muted"
                  >
                    <NetIcon network={c.network} size="sm" surface="chip" className="opacity-50" />
                    <b className="font-bold">{NETWORK_LABEL[c.network]}</b>
                    <Lock size={14} aria-hidden />
                    {props.canFixChannels ? (
                      <a href="#/channels" className="inline-flex h-[30px] items-center rounded-full bg-coral px-[11px] text-[12.5px] font-bold text-on-coral pointer-coarse:h-9">
                        {e.fix}
                      </a>
                    ) : (
                      <span className="pr-1.5 text-[12.5px] text-faint">{e.askAdmin}</span>
                    )}
                  </span>
                ) : (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${NETWORK_LABEL[c.network]} ${c.handle}`}
                    onClick={() => onChange({ channels: on ? draft.channels.filter((id) => id !== c.id) : [...draft.channels, c.id] })}
                    className={cn(
                      'relative inline-flex h-[42px] min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-full border pl-1.5 pr-3 text-2xs font-semibold pointer-coarse:min-h-11',
                      on ? 'border-transparent bg-pill text-on-pill' : 'border-line bg-glass-2 hover:bg-glass-3',
                    )}
                  >
                    <NetIcon network={c.network} size="sm" surface="chip" className={cn('bg-float', !on && 'opacity-72')} />
                    <b className="font-bold">{NETWORK_LABEL[c.network]}</b>
                    <span className={cn('min-w-0 truncate font-medium max-mobile:hidden', on ? 'text-on-pill/66' : 'text-muted')}>{c.handle}</span>
                    {on && (
                      <span className="inline-grid size-5 place-items-center rounded-full bg-butter text-[#16191d]">
                        <Check size={13} strokeWidth={2.6} aria-hidden />
                      </span>
                    )}
                    {c.status === 'expiring' && (
                      <i title={e.expiring(NETWORK_LABEL[c.network])} className="absolute -right-0.5 -top-0.5 size-[11px] rounded-full bg-butter shadow-[0_0_0_2.5px_var(--bg)]" />
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-xs text-muted">
              {e.noChannels}{' '}
              {props.canFixChannels && (
                <a href="#/channels" className="font-semibold text-text underline">
                  {e.noChannelsLink}
                </a>
              )}
            </p>
          )}
        </div>

        <div className={cn('relative rounded-[22px] border border-line-2 bg-glass-2 focus-within:border-text', props.shake > 0 && 'animate-shake')} key={props.shake}>
          <label htmlFor="cm-text" className="sr-only">
            {e.text}
          </label>
          <textarea
            id="cm-text"
            value={draft.text}
            onChange={(ev) => onChange({ text: ev.target.value })}
            placeholder={e.placeholder(brand.name)}
            readOnly={readOnly}
            className="block max-h-[62vh] min-h-[220px] w-full resize-none border-0 bg-transparent px-5 pb-2.5 pt-[18px] text-lg leading-[1.55] text-text outline-none [field-sizing:content] placeholder:text-faint max-mobile:min-h-[168px] max-mobile:px-[15px] max-mobile:pb-2 max-mobile:pt-3.5 max-mobile:text-base"
          />
          {draft.media.length > 0 && (
            <ol aria-label={e.photos} className="flex gap-2.5 overflow-x-auto px-3.5 pb-3.5 pt-1 [scrollbar-width:thin]">
              {draft.media.map((seed, i) => (
                <li key={seed} className="group relative size-[104px] flex-none overflow-hidden rounded-2xl bg-well max-mobile:size-[88px]">
                  <img src={photo(seed, 240)} alt="" className="size-full object-cover" />
                  <span className="absolute left-[7px] top-[7px] grid h-[22px] min-w-[22px] place-items-center rounded-full bg-pill px-1.5 text-[12px] font-bold text-on-pill">{i + 1}</span>
                  {!readOnly && (
                    <span className="pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100">
                      {[
                        { label: e.removePhoto(i + 1), icon: X, cls: 'right-1.5 top-1.5', run: () => props.onRemovePhoto(seed), show: true },
                        { label: e.moveEarlier(i + 1), icon: ArrowLeft, cls: 'bottom-1.5 left-1.5', run: () => move(i, -1), show: i > 0 },
                        { label: e.moveLater(i + 1), icon: ArrowRight, cls: 'bottom-1.5 right-1.5', run: () => move(i, 1), show: i < draft.media.length - 1 },
                      ]
                        .filter((b) => b.show)
                        .map(({ label: l, icon: Icon, cls, run }) => (
                          <button
                            key={l}
                            type="button"
                            aria-label={l}
                            title={l}
                            onClick={run}
                            className={cn('absolute grid size-7 cursor-pointer place-items-center rounded-full bg-[#16191d]/66 text-[#f6f7f5] pointer-coarse:size-8', cls)}
                          >
                            <Icon size={15} strokeWidth={2.2} aria-hidden />
                          </button>
                        ))}
                    </span>
                  )}
                </li>
              ))}
              {!readOnly && draft.media.length < MAX_MEDIA && (
                <li className="flex-none">
                  <button
                    type="button"
                    onClick={() => toggle('media')}
                    className="grid size-[104px] cursor-pointer place-content-center justify-items-center gap-1 rounded-2xl border-[1.5px] border-dashed border-line-2 text-2xs font-semibold text-muted hover:bg-well hover:text-text max-mobile:size-[88px]"
                  >
                    <Plus size={18} aria-hidden />
                    {e.addMedia}
                  </button>
                </li>
              )}
            </ol>
          )}
          <div className="flex flex-wrap items-center gap-1 border-t border-line px-2.5 pb-2.5 pt-2 max-mobile:p-1.5">
            <button ref={mediaBtn} type="button" aria-haspopup="dialog" aria-expanded={menu === 'media'} aria-label={e.media} onClick={() => toggle('media')} className={tool}>
              <ImageIcon className={ICON} aria-hidden />
              <span className="max-mobile:hidden">{e.media}</span>
              {draft.media.length > 0 && <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-pill px-1.5 text-[12px] font-bold text-on-pill">{draft.media.length}</span>}
            </button>
            <button ref={tagsBtn} type="button" aria-haspopup="menu" aria-expanded={menu === 'tags'} aria-label={e.hashtags} onClick={() => toggle('tags')} className={tool}>
              <Hash className={ICON} aria-hidden />
              <span className="max-mobile:hidden">{e.hashtags}</span>
            </button>
            <button ref={tplBtn} type="button" aria-haspopup="menu" aria-expanded={menu === 'template'} aria-label={e.template} onClick={() => toggle('template')} className={tool}>
              <FileText className={ICON} aria-hidden />
              <span className="max-mobile:hidden">{e.template}</span>
            </button>
            <button
              ref={assistBtn}
              type="button"
              aria-haspopup="menu"
              aria-expanded={menu === 'assist'}
              onClick={() => toggle('assist')}
              className={cn(tool, 'ml-1 bg-lilac text-on-lilac hover:bg-lilac hover:brightness-110 aria-expanded:bg-lilac')}
            >
              <Sparkles className={ICON} aria-hidden />
              <span>{e.assist}</span>
            </button>
            <span className="flex-1 max-mobile:h-0 max-mobile:basis-full" />
            {nets.length > 0 && (
              <ul className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1 pr-1 max-mobile:ml-0 max-mobile:justify-start max-mobile:gap-x-2.5 max-mobile:px-1.5 max-mobile:pb-0.5 max-mobile:pt-1">
                {nets.map((n) => (
                  <Ring key={n} network={n} text={draft.text} />
                ))}
              </ul>
            )}
          </div>
        </div>

        <MediaPicker open={menu === 'media'} onClose={close} anchor={mediaBtn} brand={brand.name} assets={props.media} picked={draft.media} onToggle={togglePhoto} />
        <HashtagPicker
          open={menu === 'tags'}
          onClose={close}
          anchor={tagsBtn}
          sets={props.hashtagSets}
          suggested={props.suggestedTags}
          onPick={(name, tags) => {
            close()
            props.onHashtags(name, tags)
          }}
        />
        <TemplatePicker
          open={menu === 'template'}
          onClose={close}
          anchor={tplBtn}
          templates={props.templates}
          onPick={(tpl) => {
            close()
            props.onTemplate(tpl)
          }}
        />
        <Popover open={menu === 'assist'} onClose={close} anchor={assistBtn} label={e.assist}>
          <div role="menu" aria-label={e.assist}>
            {ASSIST_ACTIONS.map((a) => (
              <MenuItem
                key={a}
                onClick={() => {
                  close()
                  props.onAssist(a)
                }}
              >
                {t.compose.assist[a].label}
              </MenuItem>
            ))}
            {props.undoLabel && (
              <>
                <MenuDivider />
                <MenuItem
                  icon={Undo2}
                  onClick={() => {
                    close()
                    props.onUndoAssist()
                  }}
                >
                  {t.compose.assist.undo(props.undoLabel)}
                </MenuItem>
              </>
            )}
          </div>
        </Popover>

        <ul aria-live="polite" className="mt-3 flex min-h-[34px] flex-wrap gap-2 max-mobile:min-h-0">
          {props.issues.map((issue) => (
            <IssueChip key={issue.key} issue={issue} />
          ))}
        </ul>

        <div className="mt-4 border-t border-line pt-3">
          <button
            type="button"
            aria-expanded={extras}
            onClick={() => setExtras((x) => !x)}
            className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-[14px] px-2 text-left text-xs font-semibold hover:bg-well"
          >
            <Layers size={18} aria-hidden className={extrasSummary.length ? 'text-lilac' : 'text-muted'} />
            {e.more}
            <small className={cn('min-w-0 flex-1 truncate text-2xs font-medium', extrasSummary.length ? 'text-text' : 'text-muted')}>
              {extrasSummary.length ? extrasSummary.join(' · ') : e.moreSub}
            </small>
            <ChevronDown size={18} aria-hidden className={cn('text-muted transition-transform', extras && 'rotate-180')} />
          </button>
          {extras && (
            <div className="grid gap-3.5 px-2 pb-1 pt-3">
              <label className="grid gap-1.5">
                <span className={cn(label, 'inline-flex items-center gap-[7px]')}>
                  <NetIcon network="instagram" size="xs" />
                  {e.firstComment}
                </span>
                <textarea
                  rows={2}
                  value={draft.firstComment}
                  disabled={!hasIg}
                  onChange={(ev) => onChange({ firstComment: ev.target.value })}
                  placeholder={e.firstCommentPlaceholder}
                  className={cn(field, 'resize-y')}
                />
                <small className="text-[12.5px] text-muted">{hasIg ? e.firstCommentHint : e.firstCommentNeedsIg}</small>
              </label>
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3 max-mobile:grid-cols-1">
                <label className="grid gap-1.5">
                  <span className={label}>{e.link}</span>
                  <input type="url" value={draft.link} onChange={(ev) => onChange({ link: ev.target.value })} placeholder={`${brand.handle}.com/…`} className={field} spellCheck={false} />
                </label>
                <label className="grid gap-1.5">
                  <span className={label}>{e.campaign}</span>
                  <select value={draft.campaignId} onChange={(ev) => onChange({ campaignId: ev.target.value })} className={cn(field, 'cursor-pointer')}>
                    <option value="">{props.campaigns.length ? e.noCampaign : e.noCampaigns}</option>
                    {props.campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex cursor-pointer items-center gap-3 text-xs font-semibold" title={e.utmHint}>
                <input type="checkbox" checked={draft.utm} onChange={(ev) => onChange({ utm: ev.target.checked })} className="size-4 accent-[var(--text)]" />
                {e.utm}
              </label>
              {props.link && (
                <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-well py-1.5 pl-3.5 pr-1.5">
                  <code className="min-w-0 flex-1 font-mono text-2xs leading-[1.4] text-muted [overflow-wrap:anywhere]">{props.link}</code>
                  <Button variant="ghost" size="sm" icon={Copy} onClick={props.onCopyLink} aria-label={e.copyLink}>
                    <span className="max-mobile:hidden">{e.copyLink}</span>
                  </Button>
                  <Button size="sm" onClick={props.onInsertLink}>
                    {e.insertLink}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </fieldset>
    </section>
  )
}
