import { useEffect, useId, useRef } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { Button, IconButton, cn } from './ui'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  sub?: ReactNode
  /** Turns the body into a form; submitting runs this instead of navigating. */
  onSubmit?: () => void
  footer?: ReactNode
  className?: string
  children?: ReactNode
}

/**
 * Centred modal (".modal" + ".mform" in the reference): a native <dialog>, so
 * focus is trapped, Escape closes it and the page behind is inert.
 */
export function Modal({ open, onClose, title, sub, onSubmit, footer, className, children }: ModalProps) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit?.()
  }

  const Body = onSubmit ? 'form' : 'div'
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        'm-auto max-h-[calc(100dvh-32px)] w-[min(580px,calc(100vw-24px))] max-w-none overflow-auto overscroll-contain rounded-card border border-rim bg-solid p-0 text-text shadow-pop backdrop:bg-[rgb(16_18_20/0.26)] backdrop:backdrop-blur-[6px] open:animate-rise dark:backdrop:bg-black/60',
        className,
      )}
    >
      {open && (
        <Body onSubmit={onSubmit ? submit : undefined} noValidate={onSubmit ? true : undefined} className="grid gap-[18px] p-[22px] max-mobile:p-[18px]">
          <header className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-[21px] font-bold leading-[1.4] tracking-[-0.01em]">
                {title}
              </h2>
              {sub && <p className="mt-1 text-xs leading-[1.45] text-muted">{sub}</p>}
            </div>
            <IconButton label={t.common.close} icon={X} onClick={onClose} />
          </header>
          {children}
          {footer && <footer className="flex flex-wrap justify-end gap-2.5">{footer}</footer>}
        </Body>
      )}
    </dialog>
  )
}

/** Yes/no question before something that can't be taken back in one click. */
export function ConfirmDialog({
  open,
  title,
  text,
  confirm,
  cancel,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  text: ReactNode
  confirm: string
  cancel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      sub={text}
      className="w-[min(440px,calc(100vw-24px))]"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancel}
          </Button>
          <Button variant="danger" onClick={onConfirm} autoFocus>
            {confirm}
          </Button>
        </>
      }
    />
  )
}
