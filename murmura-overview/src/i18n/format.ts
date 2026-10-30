/**
 * Intl building blocks shared by the message catalogues. Every date in the mock
 * workspace is UTC, so formatters are pinned to UTC and cached per locale +
 * options (Intl constructors are comparatively expensive).
 */

const dateCache = new Map<string, Intl.DateTimeFormat>()
const numberCache = new Map<string, Intl.NumberFormat>()

export function utc(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`
  let f = dateCache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options })
    dateCache.set(key, f)
  }
  return f
}

export function num(locale: string, options: Intl.NumberFormatOptions = {}) {
  const key = `${locale}|${JSON.stringify(options)}`
  let f = numberCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale, options)
    numberCache.set(key, f)
  }
  return f
}

const DAY_MS = 86_400_000
export const MINUTE_MS = 60_000

/** Whole days between the UTC calendar days of two instants (b − a). */
export const dayDiff = (a: Date | string, b: Date | string) =>
  Math.floor(new Date(b).getTime() / DAY_MS) - Math.floor(new Date(a).getTime() / DAY_MS)

export const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1)

/** "1 h 05" style pieces for countdowns and durations. */
export function splitMinutes(min: number) {
  const m = Math.max(0, Math.floor(min))
  return { d: Math.floor(m / 1440), h: Math.floor(m / 60), hRem: Math.floor(m / 60) % 24, m: m % 60 }
}
