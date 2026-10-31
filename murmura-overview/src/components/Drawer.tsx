import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { IconButton } from './ui'

/**
 * Side drawer (".drawer" in the reference): a native <dialog> 480px wide on
 * the right, 12px from the edges; on phones a bottom sheet with a handle.
 */
export function Drawer({ open, onClose, label, title, children }: { open: boolean; onClose: () => void; label: string; title: string; children: ReactNode }) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="fixed inset-y-3 left-auto right-3 m-0 h-auto max-h-none w-[min(480px,calc(100vw-24px))] max-w-none overflow-auto overscroll-contain rounded-[28px] border border-rim bg-glass-3 p-0 text-text shadow-pop backdrop:bg-[rgb(16_18_20/0.26)] backdrop:backdrop-blur-[6px] open:animate-drawer dark:backdrop:bg-black/60 max-mobile:inset-x-0 max-mobile:bottom-0 max-mobile:top-auto max-mobile:max-h-[90dvh] max-mobile:w-full max-mobile:rounded-b-none max-mobile:border-b-0 max-mobile:bg-solid max-mobile:open:animate-sheet"
    >
      {open && (
        <div className="relative grid content-start gap-[18px] p-6 max-mobile:px-[18px] max-mobile:pb-[calc(22px+env(safe-area-inset-bottom))] max-mobile:pt-[41px]">
          <span aria-hidden className="absolute left-1/2 top-2 hidden h-1 w-9 -translate-x-1/2 rounded-full bg-line-2 max-mobile:block" />
          <span className="absolute right-[18px] top-[18px] max-mobile:top-4">
            <IconButton label={t.common.close} icon={X} onClick={onClose} />
          </span>
          <h2 className="pr-[52px] text-[23px] font-bold leading-[1.45] tracking-[-0.02em]">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  )
}

/** "Keyboard shortcuts" (account menu, or "?"). */
export function ShortcutsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const k = t.shell.keys
  return (
    <Drawer open={open} onClose={onClose} label={k.title} title={k.title}>
      <dl className="grid gap-0.5">
        {k.rows.map(([label, keys]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-line py-2.5">
            <dt>{label}</dt>
            <dd className="flex flex-wrap justify-end gap-1.5">
              {keys.map((key) => (
                <kbd key={key} className="rounded-lg border border-line-2 bg-glass-2 px-2 py-[3px] font-[inherit] text-[12.5px] font-semibold leading-[normal]">
                  {key}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Drawer>
  )
}
