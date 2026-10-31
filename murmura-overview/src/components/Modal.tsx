import { useEffect, useId, useRef } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { Button, IconButton, cn } from './ui'

const SIZE = {
  sm: 'w-[min(460px,calc(100%-38px))]',
  md: 'w-[min(580px,calc(100%-38px))]',
  lg: 'w-[min(680px,calc(100%-38px))]',
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  sub?: ReactNode
  /** Turns the body into a form; submitting runs this instead of navigating. */
  onSubmit?: () => void
  /** The form's error line, above the buttons (kept empty so the layout doesn't jump). */
  error?: ReactNode
  footer?: ReactNode
  size?: keyof typeof SIZE
  children?: ReactNode
}

/**
 * Modal (".modal" + ".mform" in the reference): a native <dialog>, so focus is
 * trapped, Escape closes it and the page behind is inert. Centred from 761px;
 * on phones a bottom sheet whose fields scroll between a fixed header and
 * button bar.
 */
export function Modal({ open, onClose, title, sub, onSubmit, error, footer, size = 'md', children }: ModalProps) {
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
        'm-auto max-h-[calc(100dvh-32px)] max-w-none overflow-auto overscroll-contain rounded-card border border-rim bg-solid p-0 text-text shadow-pop backdrop:bg-[rgb(16_18_20/0.26)] backdrop:backdrop-blur-[6px] open:animate-rise dark:backdrop:bg-black/60',
        'max-mobile:mx-0 max-mobile:mb-0 max-mobile:max-h-[92dvh] max-mobile:w-full max-mobile:overflow-hidden max-mobile:rounded-b-none max-mobile:border-b-0',
        'max-mobile:before:absolute max-mobile:before:inset-x-0 max-mobile:before:top-2 max-mobile:before:z-[3] max-mobile:before:mx-auto max-mobile:before:h-1 max-mobile:before:w-10 max-mobile:before:rounded-[2px] max-mobile:before:bg-line-2',
        SIZE[size],
      )}
    >
      {open && (
        <Body
          onSubmit={onSubmit ? submit : undefined}
          noValidate={onSubmit ? true : undefined}
          className="block p-[22px] max-mobile:flex max-mobile:max-h-[92dvh] max-mobile:flex-col max-mobile:p-0"
        >
          <header className="mb-[18px] flex shrink-0 items-start justify-between gap-4 max-mobile:m-0 max-mobile:border-b max-mobile:border-line max-mobile:px-[18px] max-mobile:pb-3.5 max-mobile:pt-5">
            <div className="min-w-0">
              <h2 id={titleId} className="text-[21px] font-bold leading-[1.45] tracking-[-0.015em]">
                {title}
              </h2>
              {sub && <p className="mt-1 text-xs leading-[1.45] text-muted">{sub}</p>}
            </div>
            <IconButton label={t.common.close} icon={X} onClick={onClose} />
          </header>
          {children && <div className="grid gap-3.5 max-mobile:min-h-0 max-mobile:flex-1 max-mobile:overflow-y-auto max-mobile:overscroll-contain max-mobile:px-[18px] max-mobile:pb-1 max-mobile:pt-4">{children}</div>}
          <p role="alert" className="mt-2.5 min-h-[18px] shrink-0 text-[12.5px] font-semibold leading-[18px] text-bad max-mobile:mt-1.5 max-mobile:px-[18px] max-mobile:empty:m-0 max-mobile:empty:min-h-0">
            {error}
          </p>
          {footer && (
            <footer className="mt-2 flex shrink-0 flex-wrap justify-end gap-2.5 max-mobile:m-0 max-mobile:border-t max-mobile:border-line max-mobile:px-[18px] max-mobile:pb-[calc(14px+env(safe-area-inset-bottom))] max-mobile:pt-3 max-mobile:[&>*]:flex-1">
              {footer}
            </footer>
          )}
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
