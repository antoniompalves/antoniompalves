import { useState } from 'react'
import { Modal } from '../Modal'
import { Badge, Button, cn } from '../ui'
import { fillTemplate, templateParams } from '../../data/sources'
import type { WhatsAppTemplate } from '../../data/types'
import { useI18n } from '../../i18n'

/**
 * "Send a WhatsApp template": past the 24-hour window, WhatsApp only delivers
 * templates Meta approved. Pick one, fill in its parts (the first name and the
 * brand come filled in), see it as it will arrive, send.
 */
export function TemplateDialog({ templates, first, brand, onSend, onClose }: { templates: WhatsAppTemplate[]; first: string; brand: string; onSend: (text: string, name: string) => void; onClose: () => void }) {
  const { t } = useI18n()
  const d = t.inbox.sources.dialog
  const [id, setId] = useState(templates[0]?.id ?? '')
  const [values, setValues] = useState<Record<string, string[]>>({})
  const [error, setError] = useState('')
  const tpl = templates.find((x) => x.id === id)
  const count = tpl ? templateParams(tpl.body) : 0
  // {{1}} is the contact's first name in every template here; {{2}} the brand when it reads as one.
  const defaults = (x: WhatsAppTemplate) => [first, x.name === 'follow_up' ? brand : '']
  const parts = tpl ? (values[tpl.id] ?? defaults(tpl)) : []
  const set = (i: number, v: string) => {
    if (!tpl) return
    const next = [...parts]
    next[i] = v
    setValues({ ...values, [tpl.id]: next })
    setError('')
  }

  const submit = () => {
    if (!tpl) return
    if (Array.from({ length: count }, (_, i) => parts[i]?.trim()).some((v) => !v)) return setError(d.missing)
    onSend(fillTemplate(tpl.body, parts), tpl.name)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={d.title}
      sub={d.sub}
      onSubmit={submit}
      error={error}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {d.cancel}
          </Button>
          <Button type="submit">{d.send}</Button>
        </>
      }
    >
      <div role="radiogroup" aria-label={d.templates} className="grid gap-2">
        {templates.map((x) => (
          <label
            key={x.id}
            className={cn(
              'grid cursor-pointer gap-1 rounded-[18px] border-[1.5px] px-3.5 py-3 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-text',
              id === x.id ? 'border-text bg-glass-3' : 'border-line bg-glass-2',
            )}
          >
            <input type="radio" name="tpl" value={x.id} checked={id === x.id} onChange={() => (setId(x.id), setError(''))} className="sr-only" />
            <span className="flex items-center gap-2">
              <code className="font-mono text-2xs font-bold">{x.name}</code>
              <Badge tone={x.category === 'marketing' ? 'butter' : 'plain'} size="tight">
                {x.category === 'marketing' ? d.marketing : d.utility}
              </Badge>
            </span>
            <span className="text-2xs text-muted">{x.body}</span>
          </label>
        ))}
      </div>
      {tpl && count > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] gap-2.5">
          {Array.from({ length: count }, (_, i) => (
            <label key={i} className="grid gap-1.5">
              <span className="px-0.5 text-2xs font-semibold text-muted">{d.part(i + 1)}</span>
              <input
                value={parts[i] ?? ''}
                onChange={(e) => set(i, e.target.value)}
                className="h-[46px] w-full min-w-0 rounded-[14px] border border-line-2 bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text"
              />
            </label>
          ))}
        </div>
      )}
      {tpl && (
        <div className="grid gap-1.5">
          <span className="px-0.5 text-2xs font-semibold text-muted">{d.preview}</span>
          <div className="ib-wall rounded-[18px] p-3">
            <p className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-[9px] rounded-tr-none bg-ib-us px-[9px] py-1.5 text-sm leading-[1.38] text-text shadow-[0_1px_.5px_color-mix(in_srgb,var(--text)_14%,transparent)]">
              {fillTemplate(tpl.body, parts)}
            </p>
          </div>
          {tpl.category === 'marketing' && <small className="text-[12.5px] text-muted">{d.marketingHint}</small>}
        </div>
      )}
    </Modal>
  )
}
