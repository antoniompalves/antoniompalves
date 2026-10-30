import { avatar } from './assets'
import type { Conversation, DailyPoint, NetworkId, Post, PostMetrics, Workspace } from './types'

/**
 * Mock workspace mirroring the reference app at Fri, Oct 30 2026, 14:15 UTC.
 * Every figure the overview and calendar show is derived from these entities
 * (selectors.ts, calendar.ts): 976.3K audience = Σ networkStats.followers,
 * +89.6K = last 30 followerGrowth points, 19 posts this week, 6 todos,
 * 20 open conversations, 78 posts on the October grid, and so on.
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

type Seed = [id: string, name: string, net: Conversation['network'], sentiment: Conversation['sentiment'], unread: boolean, priority: boolean, minutesAgo: number, preview: string]

const CONVERSATIONS: Seed[] = [
  ['c1', 'Abigail Shaw', 'instagram', 'positive', true, false, 4, 'This is the best flat white in Portland and I will not be taking questions 😍'],
  ['c2', 'Ananya Rao', 'instagram', 'neutral', true, true, 11, 'Hi! Do you ship the Huila beans to Canada? And is the bag whole bean only?'],
  ['c3', 'Tomás Ferreira', 'youtube', 'positive', false, false, 19, 'That paint correction video was oddly relaxing. More of these please.'],
  ['c4', 'Elena Márquez', 'facebook', 'negative', true, true, 26, 'Ordered on the 2nd, still no tracking number. Not great for a subscription.'],
  ['c5', 'Jonah Pierce', 'instagram', 'positive', true, false, 38, 'The Ro side table arrived and it is even better in person.'],
  ['c6', 'Mei Tanaka', 'tiktok', 'positive', true, false, 52, 'Tried the three-step routine for a week. My skin says thank you.'],
  ['c7', 'Lukas Weber', 'x', 'neutral', true, false, 64, 'Are you open on the 1st? Google says closed but your story says open.'],
  ['c8', 'Priya Nair', 'instagram', 'negative', true, true, 81, 'The balm jar leaked in transit. Can I get a replacement?'],
  ['c9', 'Samuel Okoye', 'facebook', 'positive', true, false, 97, 'Booked the ceramic coat, the car looks brand new. Great team.'],
  ['c10', 'Chloé Martin', 'pinterest', 'neutral', true, false, 125, 'Is the smoked oak finish available on the dining bench too?'],
  ['c11', 'Diego Alvarez', 'instagram', 'positive', true, false, 160, 'Cardamom bun supremacy. That is the tweet. Well, the comment.'],
  ['c12', 'Hannah Becker', 'linkedin', 'neutral', true, false, 190, 'Would Northlight be open to a brand collaboration in Q1?'],
  ['c14', 'Ravi Kapoor', 'youtube', 'positive', true, false, 240, 'Subscribed after the tyre swap guide. Super clear.'],
  ['c15', 'Olivia Brooks', 'instagram', 'negative', true, true, 300, 'Got charged twice for the same order, can someone help?'],
  ['c16', 'Noah Fischer', 'threads', 'positive', true, false, 360, 'Love how calm your feed is. A rare thing.'],
  ['c17', 'Aiko Mori', 'tiktok', 'positive', false, false, 420, 'Latte art Friday entry incoming, prepare yourselves.'],
  ['c18', 'Ben Carter', 'facebook', 'neutral', false, false, 480, 'What time does the showroom open on Saturdays?'],
  ['c19', 'Zara Ahmed', 'instagram', 'positive', false, false, 560, 'The rose petals on the roof!! Dreamy.'],
  ['c20', 'Marco Rossi', 'x', 'negative', false, false, 640, 'Waited forty minutes past my booking slot. Not okay.'],
  ['c21', 'Lea Novak', 'pinterest', 'neutral', false, false, 720, 'Do you have care instructions for the linen throws?'],
]

const brandFor: Record<string, string> = {
  c1: 'eo', c2: 'eo', c4: 'eo', c11: 'eo', c7: 'eo', c17: 'eo',
  c3: 'vg', c9: 'vg', c14: 'vg', c20: 'vg',
  c5: 'hh', c10: 'hh', c18: 'hh', c21: 'hh',
  c6: 'wb', c8: 'wb', c15: 'wb', c19: 'wb',
  c12: 'ns', c16: 'ns',
}

const conversations: Conversation[] = CONVERSATIONS.map(
  ([id, name, network, sentiment, unread, priority, minutesAgo, preview]) => ({
    id,
    brandId: brandFor[id],
    network,
    contact: { name, avatar: avatar(id) },
    preview,
    sentiment,
    unread,
    priority,
    status: 'open',
    updatedAt: new Date(Date.parse(NOW) - minutesAgo * 60_000).toISOString(),
  }),
)

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
    { id: 'camila', name: 'Camila Ortiz', role: 'Owner', avatar: avatar('camila') },
    { id: 'elise', name: 'Elise Marchand', role: 'Admin', avatar: avatar('elise') },
    { id: 'malik', name: 'Malik Johnson', role: 'Admin', avatar: avatar('malik') },
    { id: 'haruto', name: 'Haruto Sato', role: 'Editor', avatar: avatar('haruto') },
    { id: 'omar', name: 'Omar Saleh', role: 'Editor', avatar: avatar('omar') },
    { id: 'nia', name: 'Nia Okoro', role: 'Contributor', avatar: avatar('nia') },
    { id: 'freya', name: 'Freya Nilsen', role: 'Contributor', avatar: avatar('freya') },
    { id: 'ines', name: 'Ines Duarte', role: 'Community', avatar: avatar('ines') },
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
