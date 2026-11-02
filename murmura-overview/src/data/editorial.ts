import type { Brand, KeyDate, Workspace } from './types'

/**
 * The editorial calendar's dates: Portugal's public holidays (and Lisbon's and
 * Porto's), observances, shopping moments, days for the brands' sectors, and
 * the team's own dates (Workspace.keyDates). Names are in the catalogues
 * (t.collab.dates.names), keyed by `key`.
 */

export type DateKind = 'holiday' | 'regional' | 'observance' | 'retail' | 'sector' | 'own'
type Sector = 'food' | 'beauty' | 'home'

export interface CalendarDate {
  /** YYYY-MM-DD */
  date: string
  kind: DateKind
  /** Built-in dates: the catalogue key. */
  key?: string
  /** The team's dates: their own name, brand and id. */
  name?: string
  brandId?: string | null
  id?: string
  note?: string
}

const FIXED: [md: string, key: string, kind: DateKind, sector?: Sector][] = [
  ['01-01', 'newYear', 'holiday'],
  ['02-14', 'valentines', 'retail'],
  ['03-08', 'womensDay', 'observance'],
  ['03-19', 'fathersDay', 'retail'],
  ['03-20', 'happiness', 'observance'],
  ['04-22', 'earthDay', 'observance'],
  ['04-25', 'freedomDay', 'holiday'],
  ['04-27', 'designDay', 'sector', 'home'],
  ['05-01', 'labourDay', 'holiday'],
  ['05-09', 'europeDay', 'observance'],
  ['05-21', 'teaDay', 'sector', 'food'],
  ['06-01', 'childrensDay', 'observance'],
  ['06-05', 'environmentDay', 'observance'],
  ['06-10', 'portugalDay', 'holiday'],
  ['06-13', 'santoAntonio', 'regional'],
  ['06-24', 'saoJoao', 'regional'],
  ['06-30', 'socialMediaDay', 'observance'],
  ['07-07', 'chocolateDay', 'sector', 'food'],
  ['07-24', 'selfCareDay', 'sector', 'beauty'],
  ['08-15', 'assumption', 'holiday'],
  ['10-01', 'coffeeDay', 'sector', 'food'],
  ['10-05', 'republicDay', 'holiday'],
  ['10-16', 'foodDay', 'sector', 'food'],
  ['10-31', 'halloween', 'retail'],
  ['11-01', 'allSaints', 'holiday'],
  ['11-11', 'singlesDay', 'retail'],
  ['12-01', 'restorationDay', 'holiday'],
  ['12-08', 'immaculate', 'holiday'],
  ['12-24', 'christmasEve', 'observance'],
  ['12-25', 'christmas', 'holiday'],
  ['12-31', 'newYearsEve', 'observance'],
]

const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Easter Sunday (Gregorian, the anonymous algorithm), as UTC midnight. */
export function easter(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return Date.UTC(year, month - 1, day)
}

/** The nth weekday (0 = Sunday) of a month. */
const nth = (year: number, month: number, weekday: number, n: number) => {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return Date.UTC(year, month, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7)
}

/** Every built-in date of a year; sector days only for `sectors`. */
export function observances(year: number, sectors: Set<string>): CalendarDate[] {
  const out: CalendarDate[] = FIXED.filter(([, , , s]) => !s || sectors.has(s)).map(([md, key, kind]) => ({ date: `${year}-${md}`, key, kind }))
  const e = easter(year)
  const thanksgiving = nth(year, 10, 4, 4)
  out.push(
    { date: iso(e - 47 * DAY), key: 'carnival', kind: 'observance' },
    { date: iso(e - 2 * DAY), key: 'goodFriday', kind: 'holiday' },
    { date: iso(e), key: 'easter', kind: 'holiday' },
    { date: iso(e + 60 * DAY), key: 'corpusChristi', kind: 'holiday' },
    { date: iso(nth(year, 4, 0, 1)), key: 'mothersDay', kind: 'retail' },
    { date: iso(thanksgiving + DAY), key: 'blackFriday', kind: 'retail' },
    { date: iso(thanksgiving + 4 * DAY), key: 'cyberMonday', kind: 'retail' },
  )
  return out
}

/** Which sectors the brands are in, read from what they do ("Coffee roasters · Portland"). */
export function sectorsOf(brands: Brand[]) {
  const s = new Set<string>()
  for (const b of brands) {
    const what = `${b.industry} ${b.name}`.toLowerCase()
    if (/coffee|caf[eé]|food|bakery|restaur|tea|chocolate|wine|padaria|comida|vinho/.test(what)) s.add('food')
    if (/skin|beauty|cosmetic|botanic|spa|hair|beleza|cosm[eé]tic/.test(what)) s.add('beauty')
    if (/furniture|interior|home|design|decor|m[oó]veis|casa/.test(what)) s.add('home')
  }
  return s
}

/** The team's date in a given year (yearly ones repeat on their day). */
const ownIn = (d: KeyDate, year: number): CalendarDate | null => {
  const date = d.yearly ? `${year}-${d.date.slice(5)}` : d.date
  if (!d.yearly && Number(d.date.slice(0, 4)) !== year) return null
  return { date, kind: 'own', name: d.name, brandId: d.brandId, id: d.id, note: d.note }
}

/** Every date from `from` to `to` (YYYY-MM-DD, inclusive), soonest first. */
export function datesBetween(ws: Workspace, from: string, to: string): CalendarDate[] {
  const sectors = sectorsOf(ws.brands)
  const out: CalendarDate[] = []
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) {
    out.push(...observances(y, sectors))
    for (const d of ws.keyDates ?? []) {
      const c = ownIn(d, y)
      if (c) out.push(c)
    }
  }
  return out.filter((d) => d.date >= from && d.date <= to).sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'own' ? -1 : 1))
}

/** Dates by day, for the calendar grids. */
export function datesByDay(ws: Workspace, from: string, to: string) {
  const m = new Map<string, CalendarDate[]>()
  for (const d of datesBetween(ws, from, to)) m.set(d.date, [...(m.get(d.date) ?? []), d])
  return m
}
