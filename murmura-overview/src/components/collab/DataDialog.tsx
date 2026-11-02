import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Archive, Database, Download, FileSpreadsheet, HardDrive, RotateCcw, Save, Search, Upload } from 'lucide-react'
import { ConfirmDialog, Modal } from '../Modal'
import { useToast } from '../Toast'
import { Badge, Button, Segmented, cn } from '../ui'
import { download } from '../analytics/exportCsv'
import { can } from '../../data/permissions'
import { ApiError, api, apiUrl } from '../../data/server'
import { useWorkspace } from '../../data/store'
import type { Workspace } from '../../data/types'
import { useI18n } from '../../i18n'
import type { Messages } from '../../i18n'

/**
 * "Data & backups": nightly and hand-made copies (download, restore), a full
 * export and spreadsheets, the archive of old items (search, bring back, how
 * old), and what's stored. On a server through the API (server/workspace/archive.ts);
 * in the demo, the copy in this browser.
 */

interface DataInfo {
  backups: { id: string; kind: string; createdAt: string; version: number; size: number }[]
  archive: Record<string, { count: number; bytes: number }>
  archiveDays: number
  workspaceBytes: number
  media: { previews: { count: number; bytes: number }; originals: { count: number; bytes: number } } | null
  canRestore: boolean
}

interface ArchiveRow {
  list: string
  id: string
  brandId: string | null
  at: string
  title: string
}

type Cell = string | number
const csv = (rows: Cell[][]) => rows.map((r) => r.map((v) => (/[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(',')).join('\r\n')

/** The spreadsheets: one per kind of thing. */
function sheets(ws: Workspace, t: Messages): Record<string, () => string> {
  const brand = (id: string) => ws.brands.find((b) => b.id === id)?.name ?? id
  const person = (id: string) => ws.team.find((m) => m.id === id)?.name ?? id
  return {
    posts: () =>
      csv([
        ['id', 'brand', 'status', 'when', 'networks', 'author', 'text', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks'],
        ...ws.posts.map((p) => [
          p.id,
          brand(p.brandId),
          p.status,
          p.scheduledAt,
          p.networks.join(' '),
          person(p.authorId),
          p.text,
          p.metrics?.reach ?? '',
          p.metrics?.likes ?? '',
          p.metrics?.comments ?? '',
          p.metrics?.shares ?? '',
          p.metrics?.saves ?? '',
          p.metrics?.clicks ?? '',
        ]),
      ]),
    conversations: () =>
      csv([
        ['id', 'brand', 'source', 'kind', 'contact', 'status', 'assignee', 'messages', 'last message'],
        ...ws.conversations.map((c) => [c.id, brand(c.brandId), c.network, c.kind, c.contact.name, c.status, c.assigneeId ? person(c.assigneeId) : '', c.messages.length, c.messages[c.messages.length - 1]?.at ?? '']),
      ]),
    ideas: () => csv([['id', 'brand', 'by', 'when', 'title', 'status', 'wanted by', 'post'], ...(ws.ideas ?? []).map((i) => [i.id, brand(i.brandId), person(i.by), i.at, i.title, i.status, i.wantedBy ?? '', i.postId ?? ''])]),
    team: () => csv([['name', 'email', 'role', 'brands', 'status', 'last active'], ...ws.team.map((m) => [m.name, m.email, m.role, m.brands === 'all' ? 'all' : m.brands.map(brand).join(' | '), m.status, m.lastActiveAt ?? ''])]),
    deliverables: () =>
      csv([
        ['campaign', 'creator', 'network', 'format', 'due', 'status', 'fee', 'paid', 'reach', 'clicks'],
        ...ws.deliverables.map((d) => [
          ws.creatorCampaigns.find((c) => c.id === d.campaignId)?.name ?? '',
          ws.creators.find((c) => c.id === d.creatorId)?.name ?? '',
          d.network,
          d.format,
          d.dueAt,
          d.status,
          d.fee,
          d.paid ? 'yes' : 'no',
          d.results?.reach ?? '',
          d.results?.clicks ?? '',
        ]),
      ]),
  }
  void t
}

function Section({ title, icon: Icon, aside, children }: { title: string; icon: typeof Save; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-[20px] border border-line bg-glass-2 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Icon size={17} aria-hidden />
          {title}
        </h3>
        {aside}
      </header>
      {children}
    </section>
  )
}

export function DataDialog({ open, onClose, now }: { open: boolean; onClose: () => void; now: Date }) {
  const { t } = useI18n()
  const d = t.data
  const { all, mode } = useWorkspace()
  const [tab, setTab] = useState<'backups' | 'archive' | 'storage'>('backups')
  const [info, setInfo] = useState<DataInfo | null>(null)
  const server = mode === 'server'
  const load = useCallback(() => (server ? api<DataInfo>('GET', '/data').then(setInfo, () => undefined) : Promise.resolve()), [server])
  useEffect(() => {
    if (open) void load()
  }, [open, load])
  return (
    <Modal open={open} onClose={onClose} title={d.title} sub={d.sub} size="lg">
      <Segmented label={d.title} value={tab} onChange={setTab} options={(['backups', 'archive', 'storage'] as const).map((v) => ({ value: v, label: d.tabs[v] }))} />
      {open && tab === 'backups' && <Backups info={info} onChange={load} now={now} />}
      {open && tab === 'archive' && <ArchiveTab info={info} onChange={load} />}
      {open && tab === 'storage' && <Storage info={info} ws={all} server={server} />}
    </Modal>
  )
}

function Backups({ info, onChange, now }: { info: DataInfo | null; onChange: () => void; now: Date }) {
  const { t } = useI18n()
  const d = t.data.backups
  const { all, mode, dispatch } = useWorkspace()
  const toast = useToast()
  const server = mode === 'server'
  const file = useRef<HTMLInputElement>(null)
  const [restoring, setRestoring] = useState<{ id?: string; json?: unknown } | null>(null)
  const owner = server ? !!info?.canRestore : all.team.find((m) => m.id === all.currentUserId)?.role === 'owner'
  const stamp = now.toISOString().slice(0, 10)
  const demoCopy = () => download(`kataru-backup-${stamp}.json`, JSON.stringify({ kataru: 1, at: now.toISOString(), workspace: all }), 'application/json')

  const restore = async () => {
    const r = restoring
    setRestoring(null)
    if (!r) return
    try {
      if (!server) {
        const ws = (r.json as { workspace?: Workspace })?.workspace ?? (r.json as Workspace)
        if (!ws || !Array.isArray(ws.posts) || !Array.isArray(ws.team)) throw new Error()
        dispatch({ type: 'load', ws: { ...ws, ideas: ws.ideas ?? [], keyDates: ws.keyDates ?? [], currentUserId: all.currentUserId, signedIn: true } })
      } else if (r.id) await api('POST', `/backups/${r.id}/restore`)
      else await api('POST', '/backups/restore', { backup: r.json })
      toast({ text: d.restored, icon: RotateCcw })
      onChange()
    } catch (e) {
      toast({ text: e instanceof ApiError && e.code !== 'invalid' ? e.message : d.badFile, icon: RotateCcw })
    }
  }

  return (
    <>
      <Section
        title={d.list}
        icon={Save}
        aside={
          server ? (
            <Button size="sm" icon={Save} onClick={() => void api('POST', '/backups').then(() => (toast({ text: d.made, icon: Save }), onChange()))}>
              {d.now}
            </Button>
          ) : (
            <Button size="sm" icon={Download} onClick={demoCopy}>
              {d.demoFile}
            </Button>
          )
        }
      >
        <p className="text-xs text-muted">{server ? d.auto : d.demo}</p>
        {server &&
          (info?.backups.length ? (
            <ul aria-label={d.list} className="grid gap-1">
              {info.backups.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-2.5 rounded-[14px] px-1 py-1.5">
                  <span className="min-w-0 flex-1">
                    <b className="block text-xs font-semibold">{t.dates.dayTime(new Date(b.createdAt))}</b>
                    <small className="text-[12.5px] text-muted">{t.data.bytes(b.size)}</small>
                  </span>
                  <Badge tone={b.kind === 'daily' ? 'plain' : b.kind === 'manual' ? 'sea' : 'butter'} size="tight">
                    {d.kind[b.kind] ?? b.kind}
                  </Badge>
                  <Button size="sm" variant="ghost" icon={Download} href={apiUrl(`/backups/${b.id}`)}>
                    {d.download}
                  </Button>
                  {owner && (
                    <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => setRestoring({ id: b.id })}>
                      {d.restore}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">{d.none}</p>
          ))}
        {owner && (
          <>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                try {
                  setRestoring({ json: JSON.parse(await f.text()) })
                } catch {
                  toast({ text: d.badFile, icon: RotateCcw })
                }
              }}
            />
            <Button size="sm" variant="ghost" icon={Upload} className="w-fit" onClick={() => file.current?.click()}>
              {d.fromFile}
            </Button>
          </>
        )}
        {server && !owner && <p className="text-[12.5px] text-muted">{d.onlyOwner}</p>}
      </Section>
      <Section title={d.everything} icon={Database}>
        <p className="text-xs text-muted">{d.everythingHint}</p>
        <Button size="sm" variant="ghost" icon={Download} className="w-fit" {...(server ? { href: apiUrl('/export') } : { onClick: demoCopy })}>
          {d.everything}
        </Button>
        <p className="mt-1 text-2xs font-semibold text-muted">{d.csv}</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(sheets(all, t)).map(([k, make]) => (
            <Button key={k} size="sm" variant="ghost" icon={FileSpreadsheet} onClick={() => (download(`kataru-${k}-${stamp}.csv`, make()), toast({ text: d.exported, icon: FileSpreadsheet }))}>
              {d.csvItems[k]}
            </Button>
          ))}
        </div>
      </Section>
      <ConfirmDialog open={!!restoring} title={d.restoreTitle} text={d.restoreText} confirm={d.restore} cancel={d.cancel} onClose={() => setRestoring(null)} onConfirm={() => void restore()} />
    </>
  )
}

function ArchiveTab({ info, onChange }: { info: DataInfo | null; onChange: () => void }) {
  const { t } = useI18n()
  const a = t.data.archive
  const { all, mode, dispatch } = useWorkspace()
  const toast = useToast()
  const server = mode === 'server'
  const manage = can(all, all.currentUserId, 'settings.manage')
  const days = all.settings.archiveDays ?? 365
  const [q, setQ] = useState('')
  const [list, setList] = useState('')
  const [rows, setRows] = useState<ArchiveRow[]>([])
  const [total, setTotal] = useState(0)
  const search = useCallback(
    async (offset = 0) => {
      if (!server) return
      const r = await api<{ total: number; items: ArchiveRow[] }>('GET', `/archive?q=${encodeURIComponent(q)}&lists=${list}&offset=${offset}&limit=30`).catch(() => null)
      if (!r) return
      setTotal(r.total)
      setRows((prev) => (offset ? [...prev, ...r.items] : r.items))
    },
    [server, q, list],
  )
  useEffect(() => {
    const id = window.setTimeout(() => void search(0), 250)
    return () => window.clearTimeout(id)
  }, [search, info])
  const brand = (id: string | null) => (id ? all.brands.find((b) => b.id === id)?.name : '') ?? ''
  const lists = Object.keys(a.lists)

  return (
    <>
      <Section
        title={t.data.tabs.archive}
        icon={Archive}
        aside={
          server &&
          manage && (
            <Button size="sm" icon={Archive} onClick={() => void api<{ moved: number }>('POST', '/archive/run').then((r) => (toast({ text: a.ran(r.moved), icon: Archive }), onChange()))}>
              {a.run}
            </Button>
          )
        }
      >
        <p className="text-xs text-muted">{days ? a.intro(a.options[days] ?? `${days} d`) : a.off}</p>
        {manage && (
          <label className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
            {a.after}
            <select
              value={days}
              onChange={(e) => (dispatch({ type: 'settings', patch: { archiveDays: Number(e.target.value) } }), toast({ text: a.saved, icon: Archive }))}
              className="h-9 rounded-full border border-line-2 bg-glass-2 px-3 text-xs text-text outline-none focus-visible:border-text"
            >
              {[180, 365, 730, 0].map((n) => (
                <option key={n} value={n}>
                  {a.options[n]}
                </option>
              ))}
            </select>
          </label>
        )}
        {!server && <p className="text-xs text-muted">{a.demo}</p>}
      </Section>
      {server && (
        <Section title={a.search} icon={Search} aside={<small className="text-[12.5px] text-muted">{a.count(total)}</small>}>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={a.search}
              placeholder={a.search}
              className="h-10 min-w-[200px] flex-1 rounded-full border border-line-2 bg-glass-2 px-4 text-sm text-text outline-none focus-visible:border-text"
            />
            <select value={list} onChange={(e) => setList(e.target.value)} aria-label={a.all} className="h-10 rounded-full border border-line-2 bg-glass-2 px-3 text-xs text-text outline-none">
              <option value="">{a.all}</option>
              {lists.map((k) => (
                <option key={k} value={k}>
                  {a.lists[k]}
                </option>
              ))}
            </select>
          </div>
          {rows.length ? (
            <ul aria-label={t.data.tabs.archive} className="grid gap-1">
              {rows.map((r) => (
                <li key={`${r.list}:${r.id}`} className="flex items-center gap-2.5 rounded-[14px] px-1 py-1.5">
                  <Badge tone="plain" size="tight">
                    {a.lists[r.list] ?? r.list}
                  </Badge>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-xs font-semibold">{r.title}</b>
                    <small className="text-[12.5px] text-muted">{[brand(r.brandId), t.dates.monthDay(new Date(r.at)), new Date(r.at).getUTCFullYear()].filter(Boolean).join(' · ')}</small>
                  </span>
                  {manage && (
                    <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => void api('POST', `/archive/${r.list}/${r.id}/restore`).then(() => (toast({ text: a.restored, icon: RotateCcw }), onChange()))}>
                      {a.restore}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">{a.empty}</p>
          )}
          {rows.length < total && (
            <Button size="sm" variant="ghost" className="w-fit" onClick={() => void search(rows.length)}>
              {a.more}
            </Button>
          )}
        </Section>
      )}
    </>
  )
}

function Storage({ info, ws, server }: { info: DataInfo | null; ws: Workspace; server: boolean }) {
  const { t } = useI18n()
  const s = t.data.storage
  const uploads = ws.media.filter((m) => m.bytes)
  const saved = uploads.reduce((n, m) => n + Math.max(0, (m.originalBytes ?? 0) - (m.bytes ?? 0)), 0)
  const archive = Object.values(info?.archive ?? {}).reduce((x, a) => ({ count: x.count + a.count, bytes: x.bytes + a.bytes }), { count: 0, bytes: 0 })
  const rows: [string, string, string][] = [
    [s.workspace, t.data.bytes(info?.workspaceBytes ?? new Blob([JSON.stringify(ws)]).size), s.workspaceHint],
    [s.previews, t.data.bytes(server && info?.media ? info.media.previews.bytes : uploads.reduce((n, m) => n + (m.bytes ?? 0), 0)), server ? s.previewsHint : `${s.previewsHint} ${s.demoHint}`],
    ...(server
      ? ([
          [s.originals, info?.media ? `${t.data.bytes(info.media.originals.bytes)} · ${info.media.originals.count}` : '—', s.originalsHint],
          [s.archive, `${t.data.bytes(archive.bytes)} · ${t.data.archive.count(archive.count)}`, s.archiveHint],
          [s.backups, t.data.bytes((info?.backups ?? []).reduce((n, b) => n + b.size, 0)), s.backupsHint],
        ] as [string, string, string][])
      : []),
  ]
  return (
    <Section title={t.data.tabs.storage} icon={HardDrive}>
      <dl className="grid gap-2">
        {rows.map(([k, v, hint]) => (
          <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-[14px] border border-line bg-glass px-3 py-2">
            <dt className="text-xs font-semibold">{k}</dt>
            <dd className="text-right text-sm font-bold tabular-nums">{v}</dd>
            <p className={cn('col-span-2 text-[12.5px] text-muted')}>{hint}</p>
          </div>
        ))}
      </dl>
      {uploads.length > 0 && <p className="text-xs text-muted">{s.uploads(uploads.length, t.data.bytes(saved))}</p>}
    </Section>
  )
}
