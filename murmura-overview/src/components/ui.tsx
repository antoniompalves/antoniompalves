import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Brand, NetworkId, PostStatus, Tone } from '../data/types'
import { NETWORK_LABEL, STATUS_META } from '../data/selectors'

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

/* ───────────────────────── tones ───────────────────────── */

export const toneFill: Record<Tone, string> = {
  butter: 'bg-butter text-on-butter',
  pine: 'bg-pine text-on-pine',
  coral: 'bg-coral text-on-coral',
  sea: 'bg-sea text-on-sea',
  lilac: 'bg-lilac text-on-lilac',
  ink: 'bg-ink text-on-ink',
  plain: 'bg-glass-2 text-text',
}

const toneDot: Record<Tone, string> = {
  butter: 'bg-butter shadow-[0_0_0_1px_rgb(0_0_0/0.12)]',
  pine: 'bg-good',
  coral: 'bg-coral',
  sea: 'bg-sea',
  lilac: 'bg-lilac',
  ink: 'bg-ink',
  plain: 'bg-faint',
}

/* ───────────────────────── card ───────────────────────── */

interface CardProps extends Omit<ComponentPropsWithoutRef<'section'>, 'title'> {
  title: ReactNode
  /** Muted line under the title; aligns the header to the top. */
  sub?: ReactNode
  tools?: ReactNode
  /** Padding utility; side-panel cards use 18px instead of the default 20px. */
  pad?: string
}

export function Card({ title, sub, tools, pad = 'p-5', className, children, ...rest }: CardProps) {
  return (
    <section
      className={cn('relative min-w-0 rounded-card border border-rim bg-glass shadow-card', pad, className)}
      {...rest}
    >
      <header className={cn('mb-3.5 flex min-h-[42px] justify-between gap-3', sub ? 'items-start' : 'items-center')}>
        {sub ? (
          <div>
            <h2 className="text-base font-semibold tracking-[-0.005em]">{title}</h2>
            <p className="text-2xs text-muted">{sub}</p>
          </div>
        ) : (
          <h2 className="text-base font-semibold tracking-[-0.005em]">{title}</h2>
        )}
        {tools && <div className="flex items-center gap-2">{tools}</div>}
      </header>
      {children}
    </section>
  )
}

/** Pill-shaped segmented control (".seg"): muted options, the pressed one lifted. */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 rounded-full bg-well p-[3px]">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'cursor-pointer whitespace-nowrap rounded-full px-[15px] py-2 text-2xs font-semibold transition-[background-color,color,box-shadow] duration-300 ease-soft',
            value === o.value ? 'bg-glass-3 text-text shadow-[0_2px_8px_rgb(0_0_0/0.08)] dark:bg-white/14' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ───────────────────────── buttons ───────────────────────── */

type ButtonVariant = 'ink' | 'ghost' | 'pine' | 'butter' | 'danger'

const buttonVariant: Record<ButtonVariant, string> = {
  ink: 'border-transparent bg-pill text-on-pill hover:brightness-115 dark:hover:brightness-90',
  ghost: 'border-line-2 bg-glass hover:bg-glass-2',
  pine: 'border-transparent bg-pine text-on-pine',
  butter: 'border-transparent bg-butter text-on-butter',
  danger: 'border-transparent bg-coral text-on-coral',
}

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
  size?: 'md' | 'sm'
  icon?: LucideIcon
  href?: string
}

export function Button({ variant = 'ink', size = 'md', icon: Icon, href, className, children, ...rest }: ButtonProps) {
  const cls = cn(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border font-semibold transition-[filter,background-color] duration-150',
    size === 'md' ? 'h-11 px-[19px] text-sm' : 'h-9 px-[15px] text-2xs',
    buttonVariant[variant],
    className,
  )
  const inner = (
    <>
      {Icon && <Icon size={size === 'md' ? 18 : 16} aria-hidden />}
      {children}
    </>
  )
  return href ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" className={cls} {...rest}>
      {inner}
    </button>
  )
}

interface IconButtonProps extends ComponentPropsWithoutRef<'button'> {
  label: string
  icon: LucideIcon
  href?: string
  variant?: 'line' | 'glass' | 'on-dark'
  size?: 'md' | 'sm'
}

export function IconButton({ label, icon: Icon, href, variant = 'line', size = 'md', className, ...rest }: IconButtonProps) {
  const cls = cn(
    'relative inline-grid shrink-0 cursor-pointer place-items-center rounded-full border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
    variant === 'line' && 'border-line-2 text-text hover:bg-glass-2',
    variant === 'glass' && 'size-[46px] border-rim bg-glass-2 text-text hover:bg-glass-3',
    variant === 'on-dark' && 'border-on-ink/28 text-inherit hover:bg-on-ink/12',
    variant !== 'glass' && (size === 'sm' ? 'size-[34px]' : 'size-[42px]'),
    className,
  )
  const icon = <Icon size={size === 'sm' ? 17 : 20} aria-hidden />
  return href ? (
    <a href={href} className={cls} aria-label={label} title={label}>
      {icon}
    </a>
  ) : (
    <button type="button" className={cls} aria-label={label} title={label} {...rest}>
      {icon}
      {rest.children}
    </button>
  )
}

/* ───────────────────────── badges & pills ───────────────────────── */

export function Badge({ tone, className, children }: { tone: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12.5px] font-bold tracking-[0.01em]',
        tone === 'plain' ? 'border border-line bg-glass-2 text-text' : toneFill[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** "spill" in the reference: a soft pill with a coloured status dot. */
export function StatusPill({ tone, size = 'sm', className, children }: { tone: Tone; size?: 'sm' | 'md'; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[7px] whitespace-nowrap rounded-full bg-well font-semibold',
        size === 'sm' ? 'py-0.5 pl-[7px] pr-[9px] text-[12.5px]' : 'py-1 pl-[9px] pr-[11px] text-2xs',
        tone === 'coral' && 'text-bad',
        className,
      )}
    >
      <i className={cn('size-2 shrink-0 rounded-full', toneDot[tone])} />
      {children}
    </span>
  )
}

export const PostStatusPill = ({ status, size, className }: { status: PostStatus; size?: 'sm' | 'md'; className?: string }) => (
  <StatusPill tone={STATUS_META[status].tone} size={size} className={className}>
    {STATUS_META[status].label}
  </StatusPill>
)

export const LegendDot = ({ tone, className }: { tone: Tone | 'faint'; className?: string }) => (
  <i className={cn('inline-block size-[9px] rounded-full', tone === 'faint' ? 'bg-faint' : toneFill[tone], className)} />
)

/* ───────────────────────── brand mark & avatar ───────────────────────── */

const markSize = {
  '2xs': 'size-5 rounded-md text-[9px]',
  xs: 'size-[22px] rounded-[7px] text-[11.5px]',
  sm: 'size-[30px] rounded-[9px] text-[12.5px]',
  md: 'size-[38px] rounded-[11px] text-sm',
} as const

export function BrandMark({ brand, size = 'sm', className }: { brand: Brand; size?: keyof typeof markSize; className?: string }) {
  return (
    <span
      aria-hidden
      title={brand.name}
      className={cn(
        'inline-grid shrink-0 place-items-center font-bold tracking-[-0.02em]',
        markSize[size],
        toneFill[brand.tone],
        brand.tone === 'plain' && 'border border-line',
        className,
      )}
    >
      {brand.initials}
    </span>
  )
}

const avatarSize = { sm: 'size-7', md: 'size-9', lg: 'size-[42px]' } as const

export function Avatar({ src, name, size = 'md', className }: { src: string; name: string; size?: keyof typeof avatarSize; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      title={name}
      loading="lazy"
      decoding="async"
      className={cn('shrink-0 rounded-full bg-well object-cover', avatarSize[size], className)}
    />
  )
}

export function Thumb({ src, className }: { src?: string; className?: string }) {
  return (
    <span className={cn('block shrink-0 overflow-hidden bg-well', className)}>
      {src && <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />}
    </span>
  )
}

/* ───────────────────────── networks ───────────────────────── */

/* Lucide ships no brand glyphs, so these are drawn on the same 24px grid
   with round caps/joins to sit naturally next to Lucide icons. */
const NETWORK_GLYPH: Record<NetworkId, ReactNode> = {
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M16.5 7.5h.01" />
    </>
  ),
  facebook: <path d="M14 20.5V13h2.7l.4-3H14V8.3c0-.9.3-1.5 1.6-1.5h1.6V4.2a19 19 0 0 0-2.4-.1c-2.4 0-4 1.5-4 4.1V10H8.2v3h2.6v7.5" />,
  tiktok: (
    <>
      <path d="M14 4v10.6a3.6 3.6 0 1 1-3.6-3.6" />
      <path d="M14 4c.5 2.3 2.1 3.9 4.6 4.1" />
    </>
  ),
  threads: <path d="M16.6 9.3C16 6.4 14.2 4.9 12 4.9c-3.4 0-5.3 2.9-5.3 7.1s1.9 7.1 5.5 7.1c2.6 0 4.6-1.5 4.6-3.8 0-3.7-6.1-4.2-6.1-1.4 0 1.3 1.2 2 2.4 1.9 2.2-.2 2.8-2.4 2.8-4.7" />,
  pinterest: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M11.3 9.6c.8-1.6 4.2-1.5 4.2 1.2 0 2.3-1.4 3.6-2.8 3.6-1.1 0-1.6-.9-1.4-1.6M11.9 10.9 10 19.4" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.8" y="5.8" width="18.4" height="12.4" rx="4" />
      <path d="m10.4 9.4 4.6 2.6-4.6 2.6z" />
    </>
  ),
  x: (
    <>
      <path d="M5 4.5h4l10 15h-4z" />
      <path d="M18.4 4.5 13.4 10.3M5.6 19.5l5-5.8" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <path d="M8 10.5v6M8 7.6v.01M11.5 16.5v-6M11.5 13c0-1.7 1-2.6 2.3-2.6s2.2.9 2.2 2.6v3.5" />
    </>
  ),
}

const netColor: Record<NetworkId, string> = {
  instagram: 'text-n-instagram',
  facebook: 'text-n-facebook',
  tiktok: 'text-n-tiktok',
  threads: 'text-n-threads',
  pinterest: 'text-n-pinterest',
  youtube: 'text-n-youtube',
  x: 'text-n-x',
  linkedin: 'text-n-linkedin',
}

export function NetworkGlyph({ network, className }: { network: NetworkId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round]', className)}
    >
      {NETWORK_GLYPH[network]}
    </svg>
  )
}

const netSize = { '2xs': 'size-5', xs: 'size-[22px]', sm: 'size-7', md: 'size-9', lg: 'size-[46px]' } as const

interface NetIconProps {
  network: NetworkId
  size?: keyof typeof netSize
  /** Surface the badge sits on; tunes background + ring so stacks read cleanly. */
  surface?: 'default' | 'stack' | 'on-ink' | 'on-photo'
  className?: string
}

export function NetIcon({ network, size = 'xs', surface = 'default', className }: NetIconProps) {
  const mono = network === 'x' || network === 'tiktok' || network === 'threads'
  return (
    <span
      role="img"
      aria-label={NETWORK_LABEL[network]}
      title={NETWORK_LABEL[network]}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full border',
        netSize[size],
        netColor[network],
        surface === 'default' && 'border-line bg-glass-2',
        surface === 'stack' && 'border-transparent bg-solid shadow-[0_0_0_2px_var(--solid)]',
        surface === 'on-ink' && 'border-transparent bg-on-ink shadow-[0_0_0_2px_var(--ink)]',
        surface === 'on-photo' && cn('border-transparent bg-white/92 shadow-[0_0_0_2px_var(--solid)]', mono && 'text-[#16191d]'),
        className,
      )}
    >
      <NetworkGlyph network={network} className="size-[58%] stroke-[1.9]" />
    </span>
  )
}

export function NetStack({ networks, size = 'xs', surface = 'stack' }: { networks: NetworkId[]; size?: keyof typeof netSize; surface?: NetIconProps['surface'] }) {
  return (
    <span className="inline-flex">
      {networks.map((n, i) => (
        <NetIcon key={n} network={n} size={size} surface={surface} className={i > 0 ? '-ml-1.5' : undefined} />
      ))}
    </span>
  )
}

export function Meter({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('block h-1.5 overflow-hidden rounded-full bg-well', className)}>
      <span
        className="block h-full w-full origin-left rounded-full bg-sea transition-transform duration-700 ease-soft"
        style={{ transform: `scaleX(${value})` }}
      />
    </span>
  )
}
