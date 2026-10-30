import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { en } from './en'
import type { Messages } from './en'
import { ptPT } from './pt-PT'
import { loadSetting, saveSetting } from '../storage'

export type { Messages }
export type Locale = 'en' | 'pt-PT'

/** Interface languages, each named in its own language for the switcher. */
export const LOCALES: { id: Locale; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'pt-PT', name: 'Português (Portugal)' },
]

const CATALOGUES: Record<Locale, Messages> = { en, 'pt-PT': ptPT }

/** Any Portuguese tag maps to pt-PT (the only Portuguese shipped), any English one to en. */
export function matchLocale(tag: string | null | undefined): Locale | null {
  const t = tag?.trim().toLowerCase()
  if (!t) return null
  if (t === 'pt' || t.startsWith('pt-') || t.startsWith('pt_')) return 'pt-PT'
  if (t === 'en' || t.startsWith('en-') || t.startsWith('en_')) return 'en'
  return null
}

/** `?lang=` in the URL, then the saved choice, then the browser's languages, then English. */
export function detectLocale(): Locale {
  const fromUrl = matchLocale(new URLSearchParams(window.location.search).get('lang'))
  if (fromUrl) return fromUrl
  const saved = matchLocale(loadSetting('locale'))
  if (saved) return saved
  for (const tag of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const l = matchLocale(tag)
    if (l) return l
  }
  return 'en'
}

interface I18n {
  locale: Locale
  t: Messages
  setLocale: (l: Locale) => void
}

const I18nContext = createContext<I18n>({ locale: 'en', t: en, setLocale: () => {} })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    saveSetting('locale', l)
    // An explicit choice beats a ?lang= link, so drop it to keep reloads consistent.
    const url = new URL(window.location.href)
    if (url.searchParams.has('lang')) {
      url.searchParams.delete('lang')
      window.history.replaceState(window.history.state, '', url)
    }
  }, [])

  const value = useMemo(() => ({ locale, t: CATALOGUES[locale], setLocale }), [locale, setLocale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
