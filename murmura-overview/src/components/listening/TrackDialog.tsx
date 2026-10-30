import { useState } from 'react'
import { Ear } from 'lucide-react'
import { Modal } from '../Modal'
import { Button, cn } from '../ui'
import { KEYWORD_KINDS } from '../../data/listening'
import { useWorkspace } from '../../data/store'
import type { KeywordKind } from '../../data/types'
import { useI18n } from '../../i18n'

export interface NewKeyword {
  term: string
  kind: KeywordKind
  brandId: string
}

/** "Track a keyword": the term, what it is and the brand it's for. Hashtags get their "#" and lose their spaces. */
export function TrackDialog({ brandId, onTrack, onClose }: { brandId: string; onTrack: (k: NewKeyword) => void; onClose: () => void }) {
  const { ws } = useWorkspace()
  const { t } = useI18n()
  const d = t.listening.dialog
  const [term, setTerm] = useState('')
  const [kind, setKind] = useState<KeywordKind>('topic')
  const [brand, setBrand] = useState(brandId)
  const [error, setError] = useState('')

  const submit = () => {
    let clean = term.trim().replace(/\s+/g, ' ')
    if (kind === 'hashtag') clean = `#${clean.replace(/^#+/, '').replace(/\s+/g, '')}`
    const brandName = ws.brands.find((b) => b.id === brand)?.name ?? ''
    if (clean.replace(/^#/, '').length < 2) return setError(d.tooShort)
    if (ws.keywords.some((k) => k.brandId === brand && k.term.toLowerCase() === clean.toLowerCase())) return setError(d.duplicate(brandName, clean))
    onTrack({ term: clean, kind, brandId: brand })
  }

  const field = 'h-11 w-full min-w-0 rounded-[14px] border bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text'
  const label = 'mb-1.5 block px-0.5 text-2xs font-semibold text-muted'

  return (
    <Modal
      open
      onClose={onClose}
      title={d.title}
      sub={d.sub}
      onSubmit={submit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {d.cancel}
          </Button>
          <Button type="submit" icon={Ear}>
            {d.submit}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3.5 max-mobile:grid-cols-1">
        <label className="col-span-full">
          <span className={label}>{d.term}</span>
          <input
            value={term}
            onChange={(e) => {
              setTerm(e.target.value)
              setError('')
            }}
            placeholder={d.placeholder}
            required
            autoFocus
            spellCheck={false}
            autoComplete="off"
            aria-invalid={!!error}
            aria-describedby={error ? 'ls-term-error' : undefined}
            className={cn(field, error ? 'border-coral' : 'border-line-2')}
          />
          {error && (
            <small id="ls-term-error" role="alert" className="mt-1 block text-[12.5px] font-semibold text-bad">
              {error}
            </small>
          )}
        </label>
        <label>
          <span className={label}>{d.kind}</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as KeywordKind)} className={cn(field, 'cursor-pointer border-line-2')}>
            {KEYWORD_KINDS.map((k) => (
              <option key={k} value={k}>
                {t.listening.kinds[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>{d.brand}</span>
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value)
              setError('')
            }}
            className={cn(field, 'cursor-pointer border-line-2')}
          >
            {ws.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  )
}
