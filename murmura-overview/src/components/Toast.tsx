import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useI18n } from '../i18n'

interface ToastInput {
  text: string
  icon?: LucideIcon
  /** Shows an "Undo" button that runs this and dismisses the toast. */
  undo?: () => void
  /** Any other single follow-up, e.g. "View" after scheduling a post. */
  action?: { label: string; run: () => void }
}

interface ToastItem extends ToastInput {
  id: number
}

const ToastContext = createContext<(t: ToastInput) => void>(() => {})

export const useToast = () => useContext(ToastContext)

const TIMEOUT = 5200

/** One toast at a time, bottom-centred ink pill (".toast" in the reference). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [toast, setToast] = useState<ToastItem | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((t: ToastInput) => {
    window.clearTimeout(timer.current)
    setToast({ ...t, id: Date.now() })
    timer.current = window.setTimeout(() => setToast(null), TIMEOUT)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const Icon = toast?.icon
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[95] flex justify-center px-3 max-mobile:bottom-[calc(76px+env(safe-area-inset-bottom))]">
        {toast && (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-fit max-w-[calc(100vw-24px)] animate-rise items-center gap-2.5 rounded-full bg-pill py-2.5 pl-[15px] pr-3 text-xs font-semibold text-on-pill shadow-pop"
          >
            {Icon && <Icon size={18} aria-hidden className="shrink-0" />}
            <span className="min-w-0">{toast.text}</span>
            {(toast.undo || toast.action) && (
              <button
                type="button"
                onClick={() => {
                  ;(toast.undo ?? toast.action?.run)?.()
                  setToast(null)
                }}
                className="cursor-pointer rounded-full bg-butter px-[13px] py-[7px] font-bold text-[#16191d]"
              >
                {toast.undo ? t.common.undo : toast.action?.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
