import { avatar, photo } from './assets'
import type { Conversation, DailyPoint, Post, Workspace } from './types'

/**
 * Mock workspace mirroring the reference #/overview at Fri, Oct 30 2026, 14:15.
 * Every figure the page shows is derived from these entities in selectors.ts:
 * 976.3K audience = Σ networkStats.followers, +89.6K = last 30 followerGrowth
 * points, 19 posts this week, 6 todos, 20 open conversations, and so on.
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

const at = (day: string, time: string) => `2026-${day}T${time}:00Z`

const posts: Post[] = [
  // Today
  {
    id: 'p89', brandId: 'vg', authorId: 'omar', status: 'failed', scheduledAt: at('10-30', '08:30'),
    text: 'Track-day prep, start to finish: fluids, pads, torque. Full reel on the channel.',
    media: [photo('vantage-track')], networks: ['facebook', 'instagram'],
    failure: { network: 'facebook', reason: 'Facebook disconnected the page — reconnect Vantage Garage to retry.' },
  },
  // Tomorrow
  {
    id: 'p78', brandId: 'eo', authorId: 'nia', status: 'awaiting_approval', scheduledAt: at('10-31', '09:00'),
    text: 'Pumpkin spice? Never heard of her. Our autumn menu is maple, cardamom and a very good cortado. Starts Monday.',
    media: [photo('ember-shot')], networks: ['instagram', 'facebook'],
  },
  {
    id: 'p12', brandId: 'eo', authorId: 'nia', status: 'scheduled', scheduledAt: at('10-31', '09:30'),
    text: 'Latte art Friday. Tag us in your best tulip and we will feature our favourite on Monday.',
    media: [photo('ember-pour')], networks: ['instagram', 'tiktok'],
  },
  {
    id: 'p63', brandId: 'wb', authorId: 'nia', status: 'scheduled', scheduledAt: at('10-31', '12:00'),
    text: 'Rose petals, sun-dried on the roof of our studio. They end up in every jar of the new Bloom balm.',
    media: [photo('wild-bloom')], networks: ['instagram', 'tiktok', 'pinterest'],
  },
  {
    id: 'p29', brandId: 'hh', authorId: 'freya', status: 'scheduled', scheduledAt: at('10-31', '18:00'),
    text: 'Autumn collection drops Thursday at 10:00 CET. Smoked oak, washed linen and a lot of quiet.',
    media: [photo('hollow-detail')], networks: ['instagram', 'facebook', 'youtube'],
  },
  {
    id: 'p46', brandId: 'vg', authorId: 'omar', status: 'scheduled', scheduledAt: at('10-31', '19:00'),
    text: 'Engine bay detail: steam, soft brushes, no pressure washer. Ever.',
    media: [photo('vantage-engine')], networks: ['instagram', 'x'],
  },
  {
    id: 'p83', brandId: 'wb', authorId: 'nia', status: 'awaiting_approval', scheduledAt: at('10-31', '20:00'),
    text: 'A three-step night routine for tired skin: cleanse, oil, sleep. Honestly, that is the whole secret.',
    media: [photo('wild-dropper')], networks: ['instagram', 'tiktok', 'pinterest'],
  },
  // Sun, Nov 1
  {
    id: 'p82', brandId: 'hh', authorId: 'freya', status: 'awaiting_approval', scheduledAt: at('11-01', '10:00'),
    text: 'New in: the Ro side table in smoked oak. Same joinery as our dining range, in a smaller footprint.',
    media: [photo('hollow-table')], networks: ['instagram', 'pinterest'],
  },
  {
    id: 'p84', brandId: 'ns', authorId: 'omar', status: 'scheduled', scheduledAt: at('11-01', '12:00'),
    text: 'Behind the lens: how we lit the winter lookbook with one window and a bedsheet.',
    media: [photo('northlight-set')], networks: ['instagram', 'linkedin'],
  },
  {
    id: 'p79', brandId: 'vg', authorId: 'omar', status: 'awaiting_approval', scheduledAt: at('11-01', '19:00'),
    text: 'Sunday night, empty roads, fresh ceramic coat. This is the part we do it for.',
    media: [photo('vantage-sunday')], networks: ['instagram', 'youtube'],
  },
  // Mon, Nov 2
  {
    id: 'p90', brandId: 'eo', authorId: 'nia', status: 'scheduled', scheduledAt: at('11-02', '11:00'),
    text: 'The autumn menu is live. Maple cortado, cardamom bun, and the return of the oat cookie.',
    media: [photo('ember-menu')], networks: ['instagram', 'facebook'],
  },
  {
    id: 'p91', brandId: 'vg', authorId: 'omar', status: 'scheduled', scheduledAt: at('11-02', '17:00'),
    text: 'Paint correction, before and after. Swipe slowly.',
    media: [photo('vantage-paint')], networks: ['instagram', 'tiktok'],
  },
  {
    id: 'p92', brandId: 'wb', authorId: 'nia', status: 'scheduled', scheduledAt: at('11-02', '18:00'),
    text: 'Meet the people who grow our calendula, two valleys over from the studio.',
    media: [photo('wild-field')], networks: ['instagram', 'youtube'],
  },
  {
    id: 'p93', brandId: 'ns', authorId: 'omar', status: 'scheduled', scheduledAt: at('11-02', '19:00'),
    text: 'Booking is open for December portrait sessions. Six slots left.',
    media: [photo('northlight-portrait')], networks: ['instagram', 'facebook'],
  },
  {
    id: 'p80', brandId: 'hh', authorId: 'freya', status: 'awaiting_approval', scheduledAt: at('11-02', '20:00'),
    text: 'How we finish oak: three coats of hardwax oil and a lot of patience.',
    media: [photo('hollow-oil')], networks: ['instagram', 'pinterest', 'youtube'],
  },
  // Tue, Nov 3
  {
    id: 'p94', brandId: 'vg', authorId: 'omar', status: 'changes_requested', scheduledAt: at('11-03', '12:00'),
    text: 'Ceramic coating vs. wax: the honest comparison nobody asked for.',
    media: [photo('vantage-coat')], networks: ['youtube', 'instagram'],
  },
  // Wed, Nov 4
  {
    id: 'p95', brandId: 'wb', authorId: 'nia', status: 'changes_requested', scheduledAt: at('11-04', '09:00'),
    text: 'Patch test first. Always. A quick guide for sensitive skin.',
    media: [photo('wild-patch')], networks: ['instagram', 'tiktok'],
  },
  // Thu, Nov 5
  {
    id: 'p96', brandId: 'eo', authorId: 'nia', status: 'scheduled', scheduledAt: at('11-05', '09:30'),
    text: 'Single origin of the month: Huila, Colombia. Stone fruit, panela, a long finish.',
    media: [photo('ember-beans')], networks: ['instagram', 'facebook'],
  },
  {
    id: 'p97', brandId: 'hh', authorId: 'freya', status: 'scheduled', scheduledAt: at('11-05', '09:30'),
    text: 'The autumn collection is here. Shop now, or just come and sit on it in the showroom.',
    media: [photo('hollow-launch')], networks: ['instagram', 'facebook', 'pinterest'],
  },
  {
    id: 'p98', brandId: 'vg', authorId: 'omar', status: 'scheduled', scheduledAt: at('11-05', '17:00'),
    text: 'Winter tyres are in. Book your swap before the first frost does it for you.',
    media: [photo('vantage-tyres')], networks: ['facebook', 'instagram'],
  },
  {
    id: 'p99', brandId: 'ns', authorId: 'omar', status: 'scheduled', scheduledAt: at('11-05', '18:00'),
    text: 'Studio notes: the three lenses we actually use.',
    media: [photo('northlight-lens')], networks: ['instagram', 'threads'],
  },
  // Earlier this month — the top performer
  {
    id: 'p37', brandId: 'vg', authorId: 'omar', status: 'published', scheduledAt: at('10-12', '19:00'),
    text: 'Wheels off, barrels done, balanced to the gram. Nobody sees it. We do.',
    media: [photo('vantage-night', 900)], networks: ['instagram', 'youtube', 'tiktok', 'x'],
    metrics: { reach: 346_900, engagementRate: 0.232, saves: 2_800, reachVsUsual: 8.9 },
  },
  {
    id: 'p11', brandId: 'eo', authorId: 'nia', status: 'published', scheduledAt: at('10-28', '09:00'),
    text: 'New harvest from Huila just landed. Roasting Monday, in the shop Wednesday.',
    media: [photo('ember-harvest')], networks: ['instagram', 'facebook'],
    metrics: { reach: 41_200, engagementRate: 0.094, saves: 610, reachVsUsual: 1.4 },
  },
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
    { id: 'eo', name: 'Ember & Oak', initials: 'EO', tone: 'coral' },
    { id: 'hh', name: 'Hollow Home', initials: 'HH', tone: 'butter' },
    { id: 'vg', name: 'Vantage Garage', initials: 'VG', tone: 'ink' },
    { id: 'wb', name: 'Wildroot Botanics', initials: 'WB', tone: 'pine' },
    { id: 'ns', name: 'Northlight Studio', initials: 'NS', tone: 'sea' },
  ],
  team: [
    { id: 'camila', name: 'Camila Ortiz', role: 'Owner', avatar: avatar('camila') },
    { id: 'elise', name: 'Elise Marchand', role: 'Admin', avatar: avatar('elise') },
    { id: 'malik', name: 'Malik Johnson', role: 'Admin', avatar: avatar('malik') },
    { id: 'haruto', name: 'Haruto Sato', role: 'Editor', avatar: avatar('haruto') },
    { id: 'omar', name: 'Omar Saleh', role: 'Editor', avatar: avatar('omar') },
    { id: 'nia', name: 'Nia Okafor', role: 'Contributor', avatar: avatar('nia') },
    { id: 'freya', name: 'Freya Lindqvist', role: 'Contributor', avatar: avatar('freya') },
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
