import type { Brand, Post, TeamMember } from '../../data/types'
import { dayKey, postsByDay } from '../../data/calendar'
import { STATUS_TONE } from '../../data/selectors'
import { useI18n } from '../../i18n'
import { dayDiff } from '../../i18n/format'
import { photo } from '../../data/assets'
import { Avatar, BrandMark, NetStack, PostStatusPill, cn } from '../ui'

const BAR: Record<string, string> = {
  sea: 'before:bg-sea',
  butter: 'before:bg-butter',
  pine: 'before:bg-pine',
  coral: 'before:bg-coral',
  lilac: 'before:bg-lilac',
  ink: 'before:bg-ink',
  plain: 'before:bg-faint',
}

interface ListViewProps {
  days: Date[]
  posts: Post[]
  brands: Map<string, Brand>
  team: Map<string, TeamMember>
  now: Date
  onOpen: (id: string) => void
}

/** Two weeks as an agenda (".cl-list"): one group per day that has posts. */
export function ListView({ days, posts, brands, team, now, onOpen }: ListViewProps) {
  const { t } = useI18n()
  const byDay = postsByDay(posts)
  const today = dayKey(now)
  const groups = days.map((d) => ({ d, k: dayKey(d), posts: byDay.get(dayKey(d)) ?? [] })).filter((g) => g.posts.length)

  return (
    <div className="relative grid gap-5">
      {groups.map(({ d, k, posts: dayPosts }) => {
        const near = dayDiff(now, d)
        return (
          <section key={k} className={cn(k < today && 'opacity-82')} aria-label={t.dates.monthDayLong(d)}>
            <h3 className="mx-1 mb-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <b className={cn('text-lg font-bold tracking-[-0.01em]', k === today && 'text-bad')}>
                {near === 0 || near === 1 ? t.dates.relativeDay(d, now) : t.dates.weekdayTitle(d)}
              </b>
              <small className="text-2xs font-semibold text-muted max-mobile:text-xs">
                {t.dates.monthDayLong(d)} · {t.common.post(dayPosts.length)}
              </small>
            </h3>
            <div className="grid gap-1.5">
              {dayPosts.map((p) => {
                const brand = brands.get(p.brandId)!
                const author = team.get(p.authorId)
                const tone = STATUS_TONE[p.status]
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onOpen(p.id)}
                    className={cn(
                      'relative grid w-full cursor-pointer grid-cols-[76px_52px_minmax(0,1fr)_auto_auto] items-center gap-3.5 rounded-[18px] border bg-glass-2 py-2 pl-[18px] pr-3 text-left transition-colors hover:bg-glass-3 dark:hover:bg-white/11',
                      "before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-1 before:rounded-[3px] before:content-['']",
                      BAR[tone],
                      p.status === 'draft' ? 'border-[1.5px] border-dashed border-line-2' : 'border-rim',
                      'max-mobile:grid-cols-[52px_minmax(0,1fr)_auto] max-mobile:items-start max-mobile:gap-x-3 max-mobile:gap-y-1 max-mobile:py-2.5 max-mobile:[grid-template-areas:"thumb_time_who"_"thumb_main_main"_"thumb_state_state"]',
                    )}
                  >
                    <span className="whitespace-nowrap text-xs font-bold tabular-nums max-mobile:self-center max-mobile:[grid-area:time]">{t.dates.time(new Date(p.scheduledAt))}</span>
                    <span className="grid size-[52px] place-items-center overflow-hidden rounded-[14px] bg-well max-mobile:[grid-area:thumb]">
                      {p.image ? (
                        <img src={photo(p.image, 120)} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                      ) : (
                        <BrandMark brand={brand} size="md" />
                      )}
                    </span>
                    <span className="grid min-w-0 gap-1.5 max-mobile:[grid-area:main]">
                      <b className="truncate text-sm font-semibold leading-[1.3] max-mobile:line-clamp-2 max-mobile:whitespace-normal">{p.text}</b>
                      <small className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-muted">
                        <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-2xs font-semibold">
                          <BrandMark brand={brand} size="xs" />
                          {brand.name}
                        </span>
                        <NetStack networks={p.networks} />
                      </small>
                    </span>
                    <span className="max-mobile:mt-0.5 max-mobile:[grid-area:state]">
                      <PostStatusPill status={p.status} size="md" />
                    </span>
                    {author && (
                      <span className="inline-flex max-mobile:[grid-area:who]" title={author.name}>
                        <Avatar src={author.avatar} name={author.name} size="sm" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
