import { avatar } from './assets'
import type { Conversation, DailyPoint, Message, NetworkId, Post, PostMetrics, Workspace } from './types'

/**
 * Mock workspace mirroring the reference app at Fri, Oct 30 2026, 14:15 UTC.
 * Every figure the overview and calendar show is derived from these entities
 * (selectors.ts, calendar.ts): 976.3K audience = Σ networkStats.followers,
 * +89.6K = last 30 followerGrowth points, 19 posts this week, 6 todos,
 * 20 open conversations (14 unread), 78 posts on the October grid, and so on.
 */

const NOW = '2026-10-30T14:15:00Z'

/* New followers per day, Aug 2 → Oct 30. Values read back from the reference
   chart's SVG path (y → value on its 0–10K scale). */
const DAILY_NEW_FOLLOWERS = [
  1607, 1969, 2203, 2094, 2946, 1862, 1988, 1987, 1865, 1512, 2699, 2064, 2187, 2794, 1767,
  1511, 4464, 2424, 3443, 2587, 4092, 1755, 2505, 2048, 1981, 1794, 1806, 4598, 2189, 2329,
  3122, 1689, 2491, 2465, 1841, 4411, 3653, 2527, 2522, 2476, 2419, 2112, 2657, 2395, 2318,
  2215, 2227, 2366, 2269, 2107, 3938, 2123, 2342, 2206, 2635, 2753, 4168, 2793, 2693, 2334,
  2250, 5883, 2097, 3865, 3182, 2196, 2716, 3944, 2746, 3484, 1810, 3073, 2574, 2884, 2091,
  2402, 2314, 2748, 1913, 3055, 3229, 2501, 3058, 6359, 2982, 3686, 1976, 3373, 2688, 2529,
]

const followerGrowth: DailyPoint[] = DAILY_NEW_FOLLOWERS.map((value, i, all) => {
  const d = new Date(NOW)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - (all.length - 1 - i))
  return { date: d.toISOString(), value }
})

type Status = Post['status']
type PostRow = [id: string, brand: string, author: string, status: Status, when: string, networks: string, image: string | null, text: string]

const NET: Record<string, NetworkId> = {
  ig: 'instagram', fb: 'facebook', tt: 'tiktok', th: 'threads', pin: 'pinterest', yt: 'youtube', x: 'x', li: 'linkedin',
}

/* Every post on the reference calendar between Sep 28 and Nov 8 (read from its
   List view), plus the two drafts pencilled in further out. `when` is MM-DD HH:mm UTC. */
const POSTS: PostRow[] = [
  ['p28', 'hh', 'omar', 'published', '09-30 12:45', 'ig yt', 'hollow-sofa', 'Our wool throws are woven in a family mill outside Aarhus. Here’s the loom.'],
  ['p11', 'eo', 'elise', 'published', '09-30 19:30', 'ig tt', 'ember-latte', 'Behind the drum: our head roaster Ada on why we never rush the first crack.'],
  ['p45', 'vg', 'camila', 'published', '09-30 20:15', 'ig tt', 'vantage-drive', 'Delivery day. The drive home is the best part of the job — for the owner.'],
  ['p62', 'wb', 'freya', 'published', '09-30 20:45', 'ig tt pin th', 'wild-petals', 'From field to vial in eleven days. A look inside our Lisbon lab.'],
  ['p74', 'ns', 'elise', 'published', '10-02 19:30', 'li x', null, 'Approval loops are where good posts go to die. How we got ours to under four hours.'],
  ['p27', 'hh', 'omar', 'published', '10-04 09:45', 'ig pin fb', 'hollow-throw', 'Three ways to style a reading corner with one chair and one good lamp.'],
  ['p44', 'vg', 'freya', 'published', '10-04 17:15', 'ig x', 'vantage-lift', 'Wheels off, barrels done, balanced to the gram. Nobody sees it. We do.'],
  ['p10', 'eo', 'freya', 'published', '10-04 20:00', 'ig tt', 'ember-weigh', 'Slow mornings start with a slow pour. 18g in, 300g out, three minutes of doing nothing else.'],
  ['p61', 'wb', 'malik', 'published', '10-04 20:15', 'ig pin th', 'wild-dropper', 'Slow skin: three drops, warm palms, press — don’t rub.'],
  ['p73', 'ns', 'freya', 'published', '10-06 09:45', 'li x', null, 'Hiring: a senior video editor who loves cars, coffee or both. Remote in Europe.'],
  ['p9', 'eo', 'nia', 'published', '10-06 13:00', 'ig fb tt th', 'ember-shot', 'New harvest from Huila just landed. Bright, red-apple sweet, and roasted Tuesday. Bags go out Thursday ☕'],
  ['p43', 'vg', 'haruto', 'published', '10-06 13:15', 'ig yt x', 'vantage-night', 'Night reveal. Same car, 31 hours later.'],
  ['p60', 'wb', 'elise', 'published', '10-06 13:30', 'ig tt pin th', 'wild-dried', 'Every bottle of Bloom oil holds 212 petals. We counted, then we stopped counting.'],
  ['p26', 'hh', 'camila', 'published', '10-06 18:45', 'ig fb', 'hollow-lamp', 'Light that behaves like late afternoon: meet the Pleat lamp in sand.'],
  ['p42', 'vg', 'haruto', 'published', '10-10 09:00', 'ig yt', 'vantage-wheel', 'Two-stage correction + 9H ceramic on this GT. Swipe for the 50/50.'],
  ['p8', 'eo', 'nia', 'published', '10-10 17:45', 'ig fb tt th', 'ember-roastery', 'Ten years, one roaster, about 400,000 cups. Thank you for drinking with us.'],
  ['p25', 'hh', 'haruto', 'published', '10-10 17:45', 'ig fb', 'hollow-chair', 'The Låg sofa, now in oat bouclé. Low, deep and made for long Sundays.'],
  ['p59', 'wb', 'nia', 'published', '10-10 19:30', 'ig tt th', 'wild-daisy', 'Spring Ritual is here: a bath of daisies, chamomile and calendula you can actually pronounce.'],
  ['p58', 'wb', 'nia', 'published', '10-11 08:45', 'ig tt pin', 'wild-golden', 'Giveaway 🌼 Win the full Spring Ritual set — follow, like, tag a friend.'],
  ['p24', 'hh', 'haruto', 'published', '10-11 12:00', 'ig pin fb yt', 'hollow-living', 'A home tour from @signe.lives — every piece picked over six years.'],
  ['p7', 'eo', 'camila', 'published', '10-11 17:15', 'ig tt th', 'ember-pour', 'Saturday cupping at the roastery, 10am. Free, bring a friend, leave with a bag.'],
  ['p41', 'vg', 'freya', 'published', '10-11 20:15', 'ig yt x', 'vantage-gauge', 'Q&A Thursday: ask us anything about ceramic coatings.'],
  ['p72', 'ns', 'camila', 'published', '10-12 13:00', 'li x', null, 'We grew Vantage Garage’s TikTok from 40k to 200k in nine months. Here is the playbook, minus the luck.'],
  ['p40', 'vg', 'omar', 'published', '10-15 08:45', 'ig yt tt x', 'vantage-engine', 'Booking for November is open. Six slots left for full corrections.'],
  ['p6', 'eo', 'elise', 'published', '10-15 09:00', 'ig fb tt th', 'ember-latte', 'Your dose matters more than your grinder. Here’s how we weigh every shot at the bar.'],
  ['p23', 'hh', 'haruto', 'published', '10-15 18:45', 'ig fb yt', 'hollow-room', 'Solid oak, oiled by hand, built to be handed down. The Ro side table.'],
  ['p57', 'wb', 'nia', 'published', '10-15 19:15', 'ig tt pin th', 'wild-vials', 'Our spring campaign, shot on the coast at Ericeira. Meet Inês.'],
  ['p71', 'ns', 'freya', 'published', '10-16 13:45', 'li x', null, 'Approval loops are where good posts go to die. How we got ours to under four hours.'],
  ['p39', 'vg', 'camila', 'published', '10-17 12:30', 'ig tt x', 'vantage-drive', 'Engine bay detail: steam, soft brushes, no shortcuts.'],
  ['p56', 'wb', 'nia', 'published', '10-17 17:30', 'ig pin th', 'wild-bloom', 'Rose petals, sun-dried on the roof of our studio. Yes, really.'],
  ['p22', 'hh', 'omar', 'published', '10-17 19:30', 'ig pin yt', 'hollow-detail', 'Autumn collection drops Thursday at 10:00 CET. Join the list for first pick.'],
  ['p5', 'eo', 'camila', 'published', '10-17 20:00', 'ig fb tt th', 'ember-weigh', 'The Oak blend is back for autumn — chocolate, toasted hazelnut, a little dried cherry.'],
  ['p21', 'hh', 'malik', 'published', '10-20 12:30', 'ig pin yt', 'hollow-sofa', 'Our wool throws are woven in a family mill outside Aarhus. Here’s the loom.'],
  ['p55', 'wb', 'elise', 'published', '10-20 12:30', 'ig pin th', 'wild-petals', 'From field to vial in eleven days. A look inside our Lisbon lab.'],
  ['p38', 'vg', 'camila', 'published', '10-20 18:30', 'ig', 'vantage-lift', 'Delivery day. The drive home is the best part of the job — for the owner.'],
  ['p4', 'eo', 'camila', 'published', '10-20 19:30', 'ig fb th', 'ember-shot', 'Latte art Friday. Tag us in your best tulip and we’ll share our favourites on Monday.'],
  ['p37', 'vg', 'camila', 'published', '10-22 08:00', 'ig yt tt x', 'vantage-night', 'Wheels off, barrels done, balanced to the gram. Nobody sees it. We do.'],
  ['p3', 'eo', 'malik', 'published', '10-22 09:00', 'ig tt', 'ember-roastery', 'Behind the drum: our head roaster Ada on why we never rush the first crack.'],
  ['p54', 'wb', 'nia', 'published', '10-22 12:00', 'ig tt pin', 'wild-dropper', 'Slow skin: three drops, warm palms, press — don’t rub.'],
  ['p20', 'hh', 'malik', 'published', '10-22 19:00', 'ig pin fb yt', 'hollow-throw', 'Three ways to style a reading corner with one chair and one good lamp.'],
  ['p70', 'ns', 'freya', 'published', '10-22 19:00', 'li x', null, 'Hiring: a senior video editor who loves cars, coffee or both. Remote in Europe.'],
  ['p2', 'eo', 'freya', 'published', '10-26 08:15', 'ig fb tt th', 'ember-pour', 'Slow mornings start with a slow pour. 18g in, 300g out, three minutes of doing nothing else.'],
  ['p19', 'hh', 'freya', 'published', '10-26 12:15', 'ig fb yt', 'hollow-lamp', 'Light that behaves like late afternoon: meet the Pleat lamp in sand.'],
  ['p36', 'vg', 'omar', 'published', '10-26 17:30', 'ig tt x', 'vantage-wheel', 'Night reveal. Same car, 31 hours later.'],
  ['p53', 'wb', 'freya', 'published', '10-26 17:30', 'ig tt pin', 'wild-dried', 'Every bottle of Bloom oil holds 212 petals. We counted, then we stopped counting.'],
  ['p69', 'ns', 'freya', 'published', '10-26 20:30', 'li x', null, 'We grew Vantage Garage’s TikTok from 40k to 200k in nine months. Here is the playbook, minus the luck.'],
  ['p18', 'hh', 'omar', 'published', '10-28 08:45', 'ig fb yt', 'hollow-chair', 'The Låg sofa, now in oat bouclé. Low, deep and made for long Sundays.'],
  ['p1', 'eo', 'nia', 'published', '10-28 13:00', 'ig fb tt', 'ember-latte', 'New harvest from Huila just landed. Bright, red-apple sweet, and roasted Tuesday. Bags go out Thursday ☕'],
  ['p52', 'wb', 'elise', 'published', '10-28 20:00', 'ig pin th', 'wild-daisy', 'Spring Ritual is here: a bath of daisies, chamomile and calendula you can actually pronounce.'],
  ['p35', 'vg', 'omar', 'published', '10-28 20:15', 'ig yt tt', 'vantage-gauge', 'Two-stage correction + 9H ceramic on this GT. Swipe for the 50/50.'],
  ['p89', 'vg', 'haruto', 'failed', '10-30 08:30', 'fb', 'vantage-lift', 'Booking for November is open. Six slots left for full corrections.'],
  ['p78', 'eo', 'nia', 'awaiting_approval', '10-31 09:00', 'ig fb', 'ember-shot', 'Pumpkin spice? Never heard of her. Our autumn menu is maple, cardamom and a very good cortado. Starts Monday.'],
  ['p12', 'eo', 'malik', 'scheduled', '10-31 09:30', 'ig tt', 'ember-pour', 'Latte art Friday. Tag us in your best tulip and we’ll share our favourites on Monday.'],
  ['p63', 'wb', 'camila', 'scheduled', '10-31 12:00', 'ig tt pin', 'wild-bloom', 'Rose petals, sun-dried on the roof of our studio. Yes, really.'],
  ['p29', 'hh', 'malik', 'scheduled', '10-31 18:00', 'ig fb yt', 'hollow-detail', 'Autumn collection drops Thursday at 10:00 CET. Join the list for first pick.'],
  ['p46', 'vg', 'haruto', 'scheduled', '10-31 19:00', 'ig x', 'vantage-engine', 'Engine bay detail: steam, soft brushes, no shortcuts.'],
  ['p83', 'wb', 'nia', 'awaiting_approval', '10-31 20:00', 'ig tt pin', 'wild-dropper', 'A three-step night routine for tired skin: cleanse, three drops of Bloom, and phone in another room.'],
  ['p82', 'hh', 'freya', 'awaiting_approval', '11-01 10:00', 'ig pin', 'hollow-detail', 'New in: the Ro side table in smoked oak. Same joinery, darker mood, made for small rooms.'],
  ['p75', 'ns', 'freya', 'scheduled', '11-01 12:00', 'li x', null, 'We grew Vantage Garage’s TikTok from 40k to 200k in nine months. Here is the playbook, minus the luck.'],
  ['p80', 'vg', 'omar', 'awaiting_approval', '11-01 19:00', 'ig yt', 'vantage-night', 'Before → after. Full correction on a midnight-blue M4, 26 hours in the bay. Sound on for the foam.'],
  ['p13', 'eo', 'camila', 'scheduled', '11-02 11:00', 'ig fb tt th', 'ember-roastery', 'The Oak blend is back for autumn — chocolate, toasted hazelnut, a little dried cherry.'],
  ['p47', 'vg', 'camila', 'scheduled', '11-02 17:00', 'ig', 'vantage-gauge', 'Booking for November is open. Six slots left for full corrections.'],
  ['p64', 'wb', 'camila', 'scheduled', '11-02 18:00', 'ig tt th', 'wild-vials', 'Our spring campaign, shot on the coast at Ericeira. Meet Inês.'],
  ['p79', 'eo', 'freya', 'awaiting_approval', '11-02 18:00', 'ig fb tt', 'ember-pour', 'Home brewing 101, part three: why your pour-over tastes sour, and the one grind change that fixes it.'],
  ['p30', 'hh', 'haruto', 'scheduled', '11-02 19:00', 'ig pin fb', 'hollow-room', 'Solid oak, oiled by hand, built to be handed down. The Ro side table.'],
  ['p81', 'vg', 'omar', 'changes_requested', '11-03 12:00', 'ig yt tt', 'vantage-wheel', 'Winter protection packages are live: wheels off, sealant on, ready for salt season.'],
  ['p84', 'wb', 'freya', 'changes_requested', '11-04 09:00', 'ig tt', 'wild-daisy', 'Meet calendula: the quiet flower doing the heavy lifting in Bloom oil.'],
  ['p14', 'eo', 'elise', 'scheduled', '11-05 09:30', 'ig fb tt th', 'ember-shot', 'Your dose matters more than your grinder. Here’s how we weigh every shot at the bar.'],
  ['p31', 'hh', 'camila', 'scheduled', '11-05 09:30', 'ig pin fb yt', 'hollow-living', 'A home tour from @signe.lives — every piece picked over six years.'],
  ['p85', 'eo', 'nia', 'draft', '11-05 10:00', 'ig', null, 'Draft: winter subscription teaser — need the price from Ada'],
  ['p48', 'vg', 'haruto', 'scheduled', '11-05 17:00', 'ig yt tt x', 'vantage-wheel', 'Q&A Thursday: ask us anything about ceramic coatings.'],
  ['p65', 'wb', 'malik', 'scheduled', '11-05 19:00', 'ig th', 'wild-golden', 'Giveaway 🌼 Win the full Spring Ritual set — follow, like, tag a friend.'],
  ['p76', 'ns', 'camila', 'scheduled', '11-06 09:00', 'li x', null, 'Hiring: a senior video editor who loves cars, coffee or both. Remote in Europe.'],
  ['p66', 'wb', 'nia', 'scheduled', '11-07 09:30', 'ig tt pin', 'wild-daisy', 'Spring Ritual is here: a bath of daisies, chamomile and calendula you can actually pronounce.'],
  ['p86', 'hh', 'haruto', 'draft', '11-07 10:00', 'ig', null, 'Pinterest board idea: “one room, four seasons”'],
  ['p15', 'eo', 'camila', 'scheduled', '11-07 11:00', 'ig fb tt', 'ember-weigh', 'Saturday cupping at the roastery, 10am. Free, bring a friend, leave with a bag.'],
  ['p32', 'hh', 'malik', 'scheduled', '11-07 12:30', 'ig pin fb yt', 'hollow-chair', 'The Låg sofa, now in oat bouclé. Low, deep and made for long Sundays.'],
  ['p49', 'vg', 'freya', 'scheduled', '11-07 18:00', 'ig tt x', 'vantage-night', 'Two-stage correction + 9H ceramic on this GT. Swipe for the 50/50.'],
  ['p87', 'vg', 'omar', 'draft', '11-09 10:00', 'ig', null, 'Reel script: 60 seconds of foam, no music'],
  ['p88', 'wb', 'elise', 'draft', '11-11 10:00', 'ig', null, 'Ingredient spotlight series — calendula first'],
]

/** Deterministic pseudo-random in [0, 1) so synthetic metrics stay stable between reloads. */
function seeded(key: string) {
  let h = 2166136261
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return ((h >>> 0) % 10_000) / 10_000
}

/* The reference only exposes metrics for some posts; the top post's figures are
   real (346.9K reach, 23.2%, 2.8K saves), the rest are plausible synthetic values. */
function metricsFor(id: string): PostMetrics {
  if (id === 'p37') return { impressions: 412_300, reach: 346_900, engagements: 80_480, engagementRate: 0.232, saves: 2_800, reachVsUsual: 8.9 }
  const reach = Math.round(18_000 + seeded(id) * 92_000)
  const engagementRate = 0.045 + seeded(`${id}er`) * 0.06
  const engagements = Math.round(reach * engagementRate)
  return {
    impressions: Math.round(reach * (1.18 + seeded(`${id}im`) * 0.2)),
    reach,
    engagements,
    engagementRate,
    saves: Math.round(engagements * 0.18),
    reachVsUsual: Math.round((0.7 + seeded(`${id}x`)) * 10) / 10,
  }
}

const posts: Post[] = POSTS.map(([id, brandId, authorId, status, when, nets, image, text]) => ({
  id,
  brandId,
  authorId,
  status,
  scheduledAt: `2026-${when.replace(' ', 'T')}:00Z`,
  networks: nets.split(' ').map((n) => NET[n]),
  image: image ?? undefined,
  text,
  ...(status === 'published' && { metrics: metricsFor(id) }),
  ...(id === 'p89' && {
    failure: { network: 'facebook' as const, reason: 'Facebook disconnected the page — reconnect Vantage Garage to retry.' },
  }),
}))

/* "Best times" heat per weekday (Mon…Sun) × hour (6 AM…11 PM), read from the
   reference calendar's slot --heat values. ≥ 0.9 is labelled "Peak". */
const BEST_TIMES = [
  [0.33, 0.64, 0.85, 0.59, 0.41, 0.63, 0.81, 0.66, 0.38, 0.16, 0.42, 0.58, 0.99, 0.79, 0.84, 0.81, 0.32, 0.17],
  [0.34, 0.75, 0.99, 0.58, 0.37, 0.61, 0.71, 0.53, 0.38, 0.12, 0.35, 0.54, 0.65, 0.58, 0.8, 0.65, 0.33, 0.15],
  [0.38, 0.64, 0.83, 0.81, 0.33, 0.66, 0.79, 0.55, 0.32, 0.13, 0.29, 0.8, 0.98, 0.6, 0.95, 0.71, 0.33, 0.11],
  [0.37, 0.73, 0.9, 0.6, 0.33, 0.7, 0.84, 0.73, 0.42, 0.12, 0.35, 0.56, 0.99, 0.55, 0.75, 0.58, 0.44, 0.17],
  [0.43, 0.63, 0.87, 0.59, 0.39, 0.63, 0.77, 0.6, 0.4, 0.14, 0.35, 0.67, 0.78, 0.79, 0.66, 0.68, 0.43, 0.12],
  [0.4, 0.86, 1, 0.93, 0.35, 0.82, 0.76, 0.79, 0.35, 0.13, 0.43, 0.87, 1, 0.77, 0.8, 0.91, 0.35, 0.13],
  [0.53, 0.75, 0.91, 0.96, 0.34, 0.89, 0.88, 0.8, 0.39, 0.14, 0.41, 0.89, 0.81, 0.88, 1, 0.8, 0.48, 0.18],
]

interface ConversationSeed {
  id: string
  brand: string
  network: Conversation['network']
  kind: Conversation['kind']
  name: string
  handle: string
  followers: number
  post: string | null
  sentiment: Conversation['sentiment']
  unread: boolean
  priority: boolean
  status: Conversation['status']
  assignee: string | null
  tags: string[]
  /** [from, minutes before NOW, text, author?] */
  messages: [Message['from'], number, string, string?][]
}

/* The 22 conversations in the reference inbox (20 open, 2 done), read from its
   list, threads and contact panels. Timings keep their distance from "now". */
const CONVERSATIONS: ConversationSeed[] = [
  { id: 'c1', brand: 'eo', network: 'instagram', kind: 'comment', name: 'Abigail Shaw', handle: 'abigail.shaw', followers: 23100, post: 'p1', sentiment: 'positive', unread: true, priority: false, status: 'open', assignee: null, tags: [],
    messages: [['them', 20, 'This is the best flat white in Portland and I will not be taking questions 😍']] },
  { id: 'c2', brand: 'eo', network: 'instagram', kind: 'message', name: 'Ananya Rao', handle: 'ananya.rao', followers: 16600, post: null, sentiment: 'neutral', unread: true, priority: false, status: 'open', assignee: 'haruto', tags: ['#sales'],
    messages: [['them', 45, 'Hi! Do you ship the Huila beans to Canada? And is the bag whole bean only?']] },
  { id: 'c4', brand: 'eo', network: 'facebook', kind: 'review', name: 'Elena Márquez', handle: 'elena.m.rquez', followers: 3300, post: null, sentiment: 'negative', unread: true, priority: true, status: 'open', assignee: 'ines', tags: ['#support'],
    messages: [['them', 138, 'Ordered on the 2nd, still no tracking number. Not great for a subscription.']] },
  { id: 'c5', brand: 'eo', network: 'threads', kind: 'mention', name: 'Grace Lin', handle: 'grace.lin', followers: 12500, post: null, sentiment: 'positive', unread: true, priority: false, status: 'open', assignee: null, tags: [],
    messages: [['them', 163, 'Shout out @emberandoak for the cupping session today, learned so much']] },
  { id: 'c6', brand: 'hh', network: 'instagram', kind: 'message', name: 'Hiro Tanabe', handle: 'hiro.tanabe', followers: 2600, post: null, sentiment: 'neutral', unread: false, priority: false, status: 'open', assignee: null, tags: ['#sales'],
    messages: [['them', 211, 'Is the Låg sofa available in a 3-seater? We have a small flat.']] },
  { id: 'c7', brand: 'hh', network: 'pinterest', kind: 'comment', name: 'Imani Cole', handle: 'imani.cole', followers: 23300, post: 'p18', sentiment: 'positive', unread: true, priority: false, status: 'open', assignee: 'elise', tags: [],
    messages: [['them', 231, 'Saving this whole room. Where is the rug from?']] },
  { id: 'c8', brand: 'hh', network: 'instagram', kind: 'comment', name: 'Karin Holm', handle: 'karin.holm', followers: 17700, post: 'p19', sentiment: 'negative', unread: true, priority: true, status: 'open', assignee: 'ines', tags: ['#support'],
    messages: [['them', 264, 'Lamp arrived with a cracked base. Emailed support twice, no answer yet.']] },
  { id: 'c9', brand: 'hh', network: 'facebook', kind: 'comment', name: 'Kwabena Mensah', handle: 'kwabena.mensah', followers: 18900, post: 'p20', sentiment: 'neutral', unread: false, priority: false, status: 'open', assignee: null, tags: [],
    messages: [['them', 306, 'Will the autumn collection be in the Oslo store too?']] },
  { id: 'c10', brand: 'hh', network: 'youtube', kind: 'comment', name: 'Luca Ferraro', handle: 'luca.ferraro', followers: 23200, post: 'p18', sentiment: 'positive', unread: true, priority: false, status: 'open', assignee: null, tags: [],
    messages: [['them', 354, 'The mill tour was so calming. More of this please.']] },
  { id: 'c11', brand: 'vg', network: 'instagram', kind: 'comment', name: 'Marisol Vega', handle: 'marisol.vega', followers: 22900, post: 'p36', sentiment: 'positive', unread: true, priority: false, status: 'open', assignee: null, tags: [],
    messages: [['them', 398, 'That 50/50 is unreal. How long does the ceramic last?']] },
  { id: 'c12', brand: 'vg', network: 'tiktok', kind: 'comment', name: 'Owen Fletcher', handle: 'owen.fletcher', followers: 5800, post: 'p37', sentiment: 'positive', unread: false, priority: false, status: 'open', assignee: 'elise', tags: [],
    messages: [['them', 414, 'bro the night reveal had me rewatching 6 times']] },
  { id: 'c14', brand: 'vg', network: 'x', kind: 'mention', name: 'Rajiv Menon', handle: 'rajiv.menon', followers: 20900, post: null, sentiment: 'negative', unread: true, priority: true, status: 'open', assignee: 'ines', tags: ['#support'],
    messages: [['them', 493, '@vantagegarage quoted me $1,900 then charged $2,250. Explain?']] },
  { id: 'c15', brand: 'vg', network: 'instagram', kind: 'message', name: 'Samir Khoury', handle: 'samir.khoury', followers: 11700, post: null, sentiment: 'neutral', unread: false, priority: false, status: 'open', assignee: null, tags: ['#sales'],
    messages: [['them', 522, 'Hey, any slots left in November for a full correction on a 911?']] },
  { id: 'c16', brand: 'wb', network: 'instagram', kind: 'comment', name: 'Tess Albrecht', handle: 'tess.albrecht', followers: 19200, post: 'p52', sentiment: 'positive', unread: true, priority: false, status: 'open', assignee: null, tags: [],
    messages: [['them', 565, 'Bloom oil changed my skin this winter. Buying three.']] },
  { id: 'c17', brand: 'wb', network: 'tiktok', kind: 'comment', name: 'Joon Park', handle: 'joon.park', followers: 19100, post: 'p53', sentiment: 'neutral', unread: true, priority: false, status: 'open', assignee: 'haruto', tags: [],
    messages: [['them', 621, 'is it safe for sensitive skin? I react to most oils']] },
  { id: 'c18', brand: 'wb', network: 'instagram', kind: 'message', name: 'Maya Brooks', handle: 'maya.brooks', followers: 156, post: null, sentiment: 'negative', unread: false, priority: true, status: 'open', assignee: 'ines', tags: ['#support'],
    messages: [['them', 655, 'The dropper on my bottle is broken and the oil leaked all over the box.']] },
  { id: 'c19', brand: 'wb', network: 'pinterest', kind: 'comment', name: 'Callum Reid', handle: 'callum.reid', followers: 21800, post: 'p52', sentiment: 'positive', unread: true, priority: false, status: 'open', assignee: null, tags: [],
    messages: [['them', 670, 'The dried flowers flatlay is gorgeous']] },
  { id: 'c20', brand: 'wb', network: 'threads', kind: 'mention', name: 'Zara Iqbal', handle: 'zara.iqbal', followers: 4300, post: null, sentiment: 'positive', unread: true, priority: false, status: 'open', assignee: null, tags: [],
    messages: [['them', 720, 'Using @wildroot Spring Ritual tonight. Report tomorrow.']] },
  { id: 'c21', brand: 'ns', network: 'linkedin', kind: 'comment', name: 'Abigail Shaw', handle: 'abigail.shaw', followers: 9000, post: 'p71', sentiment: 'positive', unread: false, priority: false, status: 'open', assignee: null, tags: [],
    messages: [['them', 758, 'Great breakdown. The approval loop point is so real.']] },
  { id: 'c22', brand: 'ns', network: 'linkedin', kind: 'message', name: 'Ananya Rao', handle: 'ananya.rao', followers: 10700, post: null, sentiment: 'neutral', unread: true, priority: false, status: 'open', assignee: 'elise', tags: ['#sales'],
    messages: [['them', 802, 'Hi Camila, we’re a coffee brand in Seattle looking for an agency. Do you have availability in Q1?']] },
  { id: 'c3', brand: 'eo', network: 'tiktok', kind: 'comment', name: 'Darnell Hayes', handle: 'darnell.hayes', followers: 684, post: 'p3', sentiment: 'positive', unread: false, priority: false, status: 'done', assignee: null, tags: [],
    messages: [['them', 87, 'the pour at 0:07 is so satisfying'], ['us', 65, 'Ha, that was Ada’s hundredth attempt. Worth it.', 'ines']] },
  { id: 'c13', brand: 'vg', network: 'youtube', kind: 'comment', name: 'Peter Lawson', handle: 'peter.lawson', followers: 6700, post: 'p35', sentiment: 'neutral', unread: false, priority: false, status: 'done', assignee: null, tags: [],
    messages: [['them', 466, 'What pads do you use for the second stage on soft paint?'], ['us', 444, 'Rupes yellow on a 15mm throw. We’ll do a full video on it.', 'ines']] },
]

// Wildroot Botanics' contacts have no profile photo in the reference, so they render as initials.
const NO_PHOTO = new Set(['c16', 'c17', 'c18', 'c19', 'c20'])

const conversations: Conversation[] = CONVERSATIONS.map((c) => ({
  id: c.id,
  brandId: c.brand,
  network: c.network,
  kind: c.kind,
  contact: { name: c.name, handle: c.handle, avatar: NO_PHOTO.has(c.id) ? undefined : avatar(c.handle), followers: c.followers },
  postId: c.post ?? undefined,
  sentiment: c.sentiment,
  unread: c.unread,
  priority: c.priority,
  status: c.status,
  assigneeId: c.assignee ?? undefined,
  tags: c.tags,
  messages: c.messages.map(([from, minutesAgo, text, authorId], i) => ({
    id: `${c.id}-m${i + 1}`,
    from,
    text,
    at: new Date(Date.parse(NOW) - minutesAgo * 60_000).toISOString(),
    ...(authorId && { authorId }),
  })),
}))

const minutesBefore = (m: number) => new Date(Date.parse(NOW) - m * 60_000).toISOString()

export const workspace: Workspace = {
  now: NOW,
  timeZone: 'UTC',
  currentUserId: 'camila',
  brands: [
    { id: 'eo', name: 'Ember & Oak', initials: 'EO', tone: 'coral', handle: 'emberandoak' },
    { id: 'hh', name: 'Hollow Home', initials: 'HH', tone: 'butter', handle: 'hollowhome' },
    { id: 'vg', name: 'Vantage Garage', initials: 'VG', tone: 'ink', handle: 'vantagegarage' },
    { id: 'wb', name: 'Wildroot Botanics', initials: 'WB', tone: 'pine', handle: 'wildrootbotanics' },
    { id: 'ns', name: 'Northlight Studio', initials: 'NS', tone: 'sea', handle: 'northlightstudio' },
  ],
  campaigns: [
    { id: 'cp1', brandId: 'eo', name: 'Autumn harvest', start: '2026-10-20', end: '2026-11-19' },
    { id: 'cp2', brandId: 'hh', name: 'Autumn collection', start: '2026-10-26', end: '2026-11-23' },
    { id: 'cp3', brandId: 'vg', name: 'November bookings', start: '2026-10-24', end: '2026-11-13' },
    { id: 'cp4', brandId: 'wb', name: 'Spring Ritual launch', start: '2026-10-10', end: '2026-11-08' },
  ],
  team: [
    { id: 'camila', name: 'Camila Ortiz', role: 'Owner', avatar: avatar('camila'), title: 'Founder', brands: 'all' },
    { id: 'malik', name: 'Malik Johnson', role: 'Admin', avatar: avatar('malik'), title: 'Operations lead', brands: 'all' },
    { id: 'elise', name: 'Elise Marchand', role: 'Manager', avatar: avatar('elise'), title: 'Account manager', brands: ['eo', 'wb', 'ns'] },
    { id: 'haruto', name: 'Haruto Sato', role: 'Manager', avatar: avatar('haruto'), title: 'Account manager', brands: ['vg', 'hh'] },
    { id: 'nia', name: 'Nia Okoro', role: 'Editor', avatar: avatar('nia'), title: 'Content creator', brands: ['eo', 'wb'] },
    { id: 'omar', name: 'Omar Saleh', role: 'Editor', avatar: avatar('omar'), title: 'Video editor', brands: ['vg', 'hh'] },
    { id: 'freya', name: 'Freya Nilsen', role: 'Editor', avatar: avatar('freya'), title: 'Copywriter', brands: 'all' },
    { id: 'ines', name: 'Ines Duarte', role: 'Community', avatar: avatar('ines'), title: 'Community manager', brands: 'all' },
  ],
  channels: [
    { id: 'ch-hh-yt', brandId: 'hh', network: 'youtube', status: 'expiring', expiresInDays: 2 },
    { id: 'ch-vg-fb', brandId: 'vg', network: 'facebook', status: 'disconnected' },
    { id: 'ch-hh-pin', brandId: 'hh', network: 'pinterest', status: 'connected' },
  ],
  posts,
  networkStats: [
    { network: 'tiktok', followers: 306_633, growth30d: 0.07, engagementRate: 0.088 },
    { network: 'instagram', followers: 291_690, growth30d: 0.088, engagementRate: 0.078 },
    { network: 'youtube', followers: 148_490, growth30d: 0.193, engagementRate: 0.081 },
    { network: 'pinterest', followers: 110_190, growth30d: 0.117, engagementRate: 0.068 },
    { network: 'facebook', followers: 74_525, growth30d: 0.087, engagementRate: 0.078 },
    { network: 'x', followers: 19_560, growth30d: 0.095, engagementRate: 0.081 },
    { network: 'threads', followers: 16_520, growth30d: 0.08, engagementRate: 0.068 },
    { network: 'linkedin', followers: 8_652, growth30d: 0.215, engagementRate: 0.08 },
  ],
  bestTimes: BEST_TIMES,
  followerGrowth,
  engagementRate30d: 0.10339841583396177,
  conversations,
  media: (
    [
      ['eo', 'ember-latte', 'Latte art, close'],
      ['eo', 'ember-pour', 'Milk pour'],
      ['eo', 'ember-roastery', 'The roastery'],
      ['eo', 'ember-shot', 'Espresso pull'],
      ['eo', 'ember-weigh', 'Weighing the dose'],
      ['hh', 'hollow-chair', 'Bouclé lounge chair'],
      ['hh', 'hollow-lamp', 'Pleat table lamp'],
      ['hh', 'hollow-throw', 'Wool throw'],
      ['hh', 'hollow-sofa', 'Friends on the Låg sofa'],
      ['hh', 'hollow-detail', 'Oak side table'],
      ['hh', 'hollow-room', 'Reading corner'],
      ['hh', 'hollow-living', 'Living room, full set'],
      ['vg', 'vantage-gauge', 'Redline'],
      ['vg', 'vantage-wheel', 'Fresh ceramic coat'],
      ['vg', 'vantage-night', 'Parking deck reveal'],
      ['vg', 'vantage-lift', 'Wheel balancing'],
      ['vg', 'vantage-drive', 'Delivery drive'],
      ['vg', 'vantage-engine', 'Engine bay detail'],
      ['wb', 'wild-daisy', 'Daisy bath'],
      ['wb', 'wild-dried', 'Dried botanicals'],
      ['wb', 'wild-dropper', 'Facial oil drop'],
      ['wb', 'wild-petals', 'Rose petals'],
      ['wb', 'wild-bloom', 'Rose & jasmine'],
      ['wb', 'wild-vials', 'Tincture vials'],
      ['wb', 'wild-golden', 'Golden hour dropper'],
    ] as const
  ).map(([brandId, seed, title]) => ({ brandId, seed, title })),
  savedReplies: [
    { id: 'sr1', title: 'Thanks!', text: 'Thank you so much — that means a lot to the whole team 🧡' },
    { id: 'sr2', title: 'Shipping', text: 'We ship worldwide! Orders leave within 2 working days and you’ll get tracking by email.' },
    { id: 'sr3', title: 'Sorry + DM', text: 'We’re really sorry about this. Could you send us your order number in a DM? We’ll sort it today.' },
    { id: 'sr4', title: 'Booking', text: 'We’d love to have you in. You can pick a slot here: link in bio, or reply with your preferred week.' },
    { id: 'sr5', title: 'Sensitive skin', text: 'Bloom is fragrance-free and patch-tested, but we always suggest a small test on your wrist first.' },
  ],
  todos: [
    { kind: 'approval', id: 'ap-p78', postId: 'p78' },
    { kind: 'approval', id: 'ap-p83', postId: 'p83' },
    { kind: 'approval', id: 'ap-p82', postId: 'p82' },
    { kind: 'failed_post', id: 'fl-p89', postId: 'p89' },
    { kind: 'channel', id: 'rc-hh-yt', channelId: 'ch-hh-yt' },
    { kind: 'channel', id: 'rc-vg-fb', channelId: 'ch-vg-fb' },
  ],
  audit: [
    { id: 'au1', actorId: 'elise', kind: 'approval', summary: 'approved “New harvest from Huila…” for Ember & Oak', at: minutesBefore(14) },
    { id: 'au2', actorId: 'malik', kind: 'channel', summary: 'reconnected Hollow Home on Pinterest', at: minutesBefore(2 * 60) },
    { id: 'au3', actorId: 'haruto', kind: 'review', summary: 'requested changes on a Vantage Garage post', at: minutesBefore(5 * 60) },
    { id: 'au4', actorId: 'camila', kind: 'member', summary: 'invited Sara Whitfield as Editor', at: minutesBefore(7 * 60) },
    { id: 'au5', actorId: 'malik', kind: 'permission', summary: 'gave Community the “Assign conversations” permission', at: minutesBefore(9 * 60) },
    { id: 'au6', actorId: 'omar', kind: 'schedule', summary: 'scheduled 3 posts for Vantage Garage', at: minutesBefore(11 * 60) },
    { id: 'au7', actorId: 'ines', kind: 'inbox', summary: 'closed 14 conversations', at: minutesBefore(13 * 60) },
  ],
  notifications: { unread: 4 },
}
