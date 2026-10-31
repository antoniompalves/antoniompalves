import { avatar, personPhoto } from './assets'
import { ACCOUNT_STATS, HEAT, NETWORK_TRENDS, SERIES } from './analyticsData'
import { COMPETITORS, KEYWORDS, MENTIONS } from './listeningData'
import { POST_EXTRAS } from './postsData'
import type { Competitor, Conversation, Keyword, Mention, Message, NetworkId, Post, PostMetrics, Workspace } from './types'

/**
 * Mock workspace mirroring the reference app at Fri, Oct 30 2026, 14:15 UTC.
 * Every figure the overview, calendar and analytics show is derived from these
 * entities (selectors.ts, calendar.ts, analytics.ts): 976.3K audience = Σ followers
 * of the 19 channels, +89.6K = new followers in the last 30 days of the
 * analytics series, 19 posts this week, 6 todos, 20 open conversations
 * (14 unread), 78 posts on the October grid, and so on.
 */

const NOW = '2026-10-30T14:15:00Z'

type Status = Post['status']
type PostRow = [id: string, brand: string, author: string, status: Status, when: string, networks: string, image: string | null, text: string]

const NET: Record<string, NetworkId> = {
  ig: 'instagram', fb: 'facebook', tt: 'tiktok', th: 'threads', pin: 'pinterest', yt: 'youtube', x: 'x', li: 'linkedin',
}

/* Every post on the reference calendar between Sep 28 and Nov 8 (read from its
   List view), the two drafts pencilled in further out, and the posts scheduled for
   Nov 9–12. `when` is MM-DD HH:mm UTC; further photos, campaigns and review trails
   are in postsData.ts. */
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
  ['p16', 'eo', 'malik', 'scheduled', '11-09 09:00', 'ig fb tt th', 'ember-latte', 'Ten years, one roaster, about 400,000 cups. Thank you for drinking with us.'],
  ['p33', 'hh', 'freya', 'scheduled', '11-09 12:30', 'ig pin fb yt', 'hollow-lamp', 'Light that behaves like late afternoon: meet the Pleat lamp in sand.'],
  ['p67', 'wb', 'camila', 'scheduled', '11-09 17:00', 'ig pin th', 'wild-dried', 'Every bottle of Bloom oil holds 212 petals. We counted, then we stopped counting.'],
  ['p50', 'vg', 'freya', 'scheduled', '11-09 18:30', 'ig yt tt x', 'vantage-lift', 'Night reveal. Same car, 31 hours later.'],
  ['p77', 'ns', 'freya', 'scheduled', '11-10 12:30', 'li x', null, 'Approval loops are where good posts go to die. How we got ours to under four hours.'],
  ['p68', 'wb', 'nia', 'scheduled', '11-12 11:00', 'ig pin th', 'wild-dropper', 'Slow skin: three drops, warm palms, press — don’t rub.'],
  ['p17', 'eo', 'camila', 'scheduled', '11-12 12:30', 'ig fb tt', 'ember-pour', 'New harvest from Huila just landed. Bright, red-apple sweet, and roasted Tuesday. Bags go out Thursday ☕'],
  ['p34', 'hh', 'haruto', 'scheduled', '11-12 19:30', 'ig pin fb yt', 'hollow-throw', 'Three ways to style a reading corner with one chair and one good lamp.'],
  ['p51', 'vg', 'malik', 'scheduled', '11-12 19:30', 'ig yt x', 'vantage-drive', 'Wheels off, barrels done, balanced to the gram. Nobody sees it. We do.'],
]

/* Lifetime metrics of every published post, as the reference stores them:
   [impressions, reach, likes, comments, shares, saves, link clicks, views]. */
const METRICS: Record<string, [number, number, number, number, number, number, number, number]> = {
  p28: [41693, 30985, 2442, 145, 172, 111, 155, 46572],
  p11: [71470, 48060, 3404, 109, 247, 373, 301, 55398],
  p45: [122308, 77149, 3820, 222, 363, 389, 1221, 162781],
  p62: [17137, 14000, 584, 51, 13, 65, 150, 22485],
  p74: [2615, 1869, 44, 2, 3, 3, 29, 0],
  p27: [194857, 146647, 13170, 1079, 404, 1605, 2305, 0],
  p44: [14511, 9653, 285, 23, 15, 26, 42, 0],
  p10: [96646, 72078, 6698, 522, 202, 729, 682, 121770],
  p61: [17154, 11885, 410, 31, 19, 33, 172, 0],
  p73: [8342, 6337, 527, 17, 27, 28, 46, 0],
  p9: [45446, 31449, 2478, 112, 131, 289, 318, 69862],
  p43: [67057, 48432, 4128, 353, 182, 438, 524, 72910],
  p60: [87007, 59451, 2691, 206, 204, 323, 240, 124569],
  p26: [134597, 103815, 9196, 295, 238, 1411, 1123, 0],
  p42: [52596, 33680, 1131, 69, 53, 96, 192, 68925],
  p8: [75557, 54776, 5052, 178, 338, 582, 562, 54018],
  p25: [50053, 39508, 1462, 122, 49, 199, 510, 0],
  p59: [44112, 30287, 2997, 145, 148, 427, 335, 70132],
  p58: [46173, 37419, 1599, 113, 34, 70, 191, 32826],
  p24: [215344, 154157, 8932, 341, 723, 499, 1269, 245797],
  p7: [45597, 36687, 2885, 87, 246, 449, 380, 72782],
  p41: [161456, 112543, 5358, 338, 183, 230, 1312, 214442],
  p72: [4653, 3122, 132, 6, 10, 21, 45, 0],
  p40: [86601, 57733, 2638, 142, 123, 138, 652, 120647],
  p6: [32404, 23906, 1052, 88, 83, 44, 160, 47163],
  p23: [51292, 38976, 1885, 143, 89, 138, 476, 77336],
  p57: [38286, 30367, 1193, 104, 88, 183, 331, 28900],
  p71: [17542, 14242, 1246, 45, 65, 189, 154, 0],
  p39: [133188, 105268, 4178, 169, 255, 522, 866, 138706],
  p56: [12277, 8609, 348, 18, 14, 19, 128, 0],
  p22: [87844, 60261, 1526, 120, 130, 107, 646, 120956],
  p5: [31038, 21949, 770, 55, 62, 109, 331, 22304],
  p21: [46388, 29394, 807, 64, 22, 93, 340, 63695],
  p55: [25661, 17972, 937, 29, 63, 84, 148, 0],
  p38: [15780, 10739, 544, 22, 49, 28, 81, 0],
  p4: [48801, 38188, 2561, 156, 156, 175, 279, 0],
  p37: [525874, 346861, 69241, 2411, 5938, 2825, 1987, 651353],
  p3: [160665, 110602, 21781, 1561, 509, 2032, 1140, 185266],
  p54: [141417, 91189, 12415, 948, 843, 1260, 1281, 193497],
  p20: [183650, 130421, 14146, 935, 1028, 1975, 1238, 183695],
  p70: [7497, 5153, 343, 16, 9, 30, 76, 0],
  p2: [90262, 71158, 2797, 116, 116, 371, 736, 131368],
  p19: [66097, 53981, 2382, 148, 212, 208, 770, 51075],
  p36: [234391, 167997, 6623, 534, 589, 632, 1928, 248185],
  p53: [46057, 35580, 1848, 153, 39, 203, 282, 46564],
  p69: [3495, 2445, 243, 13, 16, 14, 38, 0],
  p18: [121516, 86036, 6932, 610, 477, 1065, 420, 177635],
  p1: [31532, 19757, 694, 62, 37, 65, 212, 46570],
  p52: [54993, 42280, 1836, 104, 126, 183, 387, 0],
  p35: [154063, 103587, 6964, 536, 495, 399, 1568, 230745],
}

function metricsFor(id: string): PostMetrics {
  const [impressions, reach, likes, comments, shares, saves, clicks, views] = METRICS[id]
  return { impressions, reach, likes, comments, shares, saves, clicks, views }
}

const posts: Post[] = POSTS.map(([id, brandId, authorId, status, when, nets, image, text]) => ({
  id,
  brandId,
  authorId,
  status,
  scheduledAt: `2026-${when.replace(' ', 'T')}:00Z`,
  networks: nets.split(' ').map((n) => NET[n]),
  media: image ? [image, ...(POST_EXTRAS[id].more ?? [])] : [],
  text,
  createdAt: `${POST_EXTRAS[id].created.slice(0, -1)}:00Z`,
  reviews: POST_EXTRAS[id].reviews.map(([by, at, decision, note]) => ({ by, at: `${at.slice(0, -1)}:00Z`, decision, ...(note && { note }) })),
  ...(POST_EXTRAS[id].campaign && { campaignId: POST_EXTRAS[id].campaign }),
  ...(status === 'published' && { metrics: metricsFor(id) }),
  ...(id === 'p89' && {
    failure: { network: 'facebook' as const, code: 'disconnected' as const },
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

/* Listening: the reference's 14 keywords, the 90 mentions they caught over the
   last six days and nine competitors. People who also write to the inbox keep
   the same photo there and here. */
const keywords: Keyword[] = KEYWORDS.map(([id, brandId, term, kind, history]) => ({ id, brandId, term, kind, history }))

const mentions: Mention[] = MENTIONS.map(([id, keywordId, network, author, handle, hasPhoto, minutesAgo, sentiment, reach, text]) => ({
  id,
  keywordId,
  network: network as NetworkId,
  author,
  handle,
  ...(hasPhoto && { avatar: personPhoto(handle) }),
  text,
  at: minutesBefore(minutesAgo),
  sentiment,
  reach,
}))

const competitors: Competitor[] = COMPETITORS.map(([id, brandId, name, handle, followers, growth, engagementRate, postsPerWeek, mentions]) => ({
  id,
  brandId,
  name,
  handle,
  followers,
  growth,
  engagementRate,
  postsPerWeek,
  mentions,
}))

export const workspace: Workspace = {
  now: NOW,
  timeZone: 'Europe/Lisbon',
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
  /* The 12 people on the reference team (one invite still pending) and its seven roles. */
  team: [
    { id: 'camila', name: 'Camila Ortiz', role: 'owner', avatar: avatar('camila'), title: 'Founder', brands: 'all', email: 'camila@northlight.studio', status: 'active', mfa: true, joinedAt: '2025-02-22T00:00:00Z', lastActiveAt: minutesBefore(0) },
    { id: 'malik', name: 'Malik Johnson', role: 'admin', avatar: avatar('malik'), title: 'Operations lead', brands: 'all', email: 'malik@northlight.studio', status: 'active', mfa: true, joinedAt: '2026-04-13T00:00:00Z', lastActiveAt: minutesBefore(1148) },
    { id: 'elise', name: 'Elise Marchand', role: 'manager', avatar: avatar('elise'), title: 'Account manager', brands: ['eo', 'wb', 'ns'], email: 'elise@northlight.studio', status: 'active', mfa: true, joinedAt: '2024-09-26T00:00:00Z', lastActiveAt: minutesBefore(785) },
    { id: 'haruto', name: 'Haruto Sato', role: 'manager', avatar: avatar('haruto'), title: 'Account manager', brands: ['vg', 'hh'], email: 'haruto@northlight.studio', status: 'active', mfa: true, joinedAt: '2025-04-30T00:00:00Z', lastActiveAt: minutesBefore(163) },
    { id: 'nia', name: 'Nia Okoro', role: 'editor', avatar: avatar('nia'), title: 'Content creator', brands: ['eo', 'wb'], email: 'nia@northlight.studio', status: 'active', mfa: true, joinedAt: '2024-05-16T00:00:00Z', lastActiveAt: minutesBefore(48) },
    { id: 'omar', name: 'Omar Saleh', role: 'editor', avatar: avatar('omar'), title: 'Video editor', brands: ['vg', 'hh'], email: 'omar@northlight.studio', status: 'active', mfa: true, joinedAt: '2025-12-14T00:00:00Z', lastActiveAt: minutesBefore(311) },
    { id: 'freya', name: 'Freya Nilsen', role: 'editor', avatar: avatar('freya'), title: 'Copywriter', brands: 'all', email: 'freya@northlight.studio', status: 'active', mfa: false, joinedAt: '2024-11-15T00:00:00Z', lastActiveAt: minutesBefore(897) },
    { id: 'ines', name: 'Ines Duarte', role: 'community', avatar: avatar('ines'), title: 'Community manager', brands: 'all', email: 'ines@northlight.studio', status: 'active', mfa: true, joinedAt: '2026-04-28T00:00:00Z', lastActiveAt: minutesBefore(1397) },
    { id: 'lin', name: 'Lin Zhao', role: 'analyst', avatar: avatar('lin'), title: 'Data analyst', brands: 'all', email: 'lin@northlight.studio', status: 'active', mfa: false, joinedAt: '2024-08-01T00:00:00Z', lastActiveAt: minutesBefore(782) },
    { id: 'kwame', name: 'Kwame Asante', role: 'client', avatar: avatar('kwame'), title: 'Owner, Vantage Garage', brands: ['vg'], email: 'kwame@northlight.studio', status: 'active', mfa: false, joinedAt: '2026-04-08T00:00:00Z', lastActiveAt: minutesBefore(1776) },
    { id: 'peter', name: 'Peter Lund', role: 'client', avatar: avatar('peter'), title: 'Marketing, Hollow Home', brands: ['hh'], email: 'peter@northlight.studio', status: 'active', mfa: false, joinedAt: '2025-02-19T00:00:00Z', lastActiveAt: minutesBefore(1241) },
    { id: 'sara', name: 'Sara Whitfield', role: 'editor', title: 'Freelance designer', brands: ['eo'], email: 'sara@northlight.studio', status: 'invited', mfa: true, joinedAt: '2026-09-04T00:00:00Z' },
  ],
  roles: [
    { id: 'owner', perms: ['post.create', 'post.publish', 'post.approve', 'post.delete', 'calendar.edit', 'inbox.reply', 'inbox.assign', 'analytics.view', 'analytics.export', 'listening.manage', 'library.manage', 'channels.manage', 'team.manage', 'billing.manage', 'settings.manage'], tone: 'ink', system: true },
    { id: 'admin', perms: ['post.create', 'post.publish', 'post.approve', 'post.delete', 'calendar.edit', 'inbox.reply', 'inbox.assign', 'analytics.view', 'analytics.export', 'listening.manage', 'library.manage', 'channels.manage', 'team.manage', 'settings.manage'], tone: 'sea', system: true },
    { id: 'manager', perms: ['post.create', 'post.publish', 'post.approve', 'post.delete', 'calendar.edit', 'inbox.reply', 'inbox.assign', 'analytics.view', 'analytics.export', 'listening.manage', 'library.manage'], tone: 'pine', system: true },
    { id: 'editor', perms: ['post.create', 'calendar.edit', 'inbox.reply', 'analytics.view', 'library.manage'], tone: 'butter', system: true },
    { id: 'community', perms: ['inbox.reply', 'inbox.assign', 'analytics.view'], tone: 'lilac', system: true },
    { id: 'analyst', perms: ['analytics.view', 'analytics.export', 'listening.manage'], tone: 'plain', system: true },
    { id: 'client', perms: ['post.approve', 'analytics.view'], tone: 'coral', system: true },
  ],
  settings: {
    name: 'Northlight Studio',
    weekStart: 1,
    approval: 'perm',
    shortenLinks: true,
    utm: true,
    utmSource: 'kataru',
    notify: { approvals: true, mentions: true, failures: true, digest: false },
    plan: 'agency',
    seats: 15,
    requireMfa: false,
  },
  /* The 19 connected accounts, in the order the reference lists them. */
  channels: [
    { id: 'ch-eo-ig', brandId: 'eo', network: 'instagram', handle: '@emberandoak', followers: 48210, status: 'connected' },
    { id: 'ch-eo-fb', brandId: 'eo', network: 'facebook', handle: 'Ember & Oak', followers: 21480, status: 'connected' },
    { id: 'ch-eo-tt', brandId: 'eo', network: 'tiktok', handle: '@emberandoak', followers: 63900, status: 'connected' },
    { id: 'ch-eo-th', brandId: 'eo', network: 'threads', handle: '@emberandoak', followers: 9120, status: 'connected' },
    { id: 'ch-hh-ig', brandId: 'hh', network: 'instagram', handle: '@hollowhome', followers: 112400, status: 'connected' },
    { id: 'ch-hh-pin', brandId: 'hh', network: 'pinterest', handle: '@hollowhome', followers: 86300, status: 'connected' },
    { id: 'ch-hh-fb', brandId: 'hh', network: 'facebook', handle: 'Hollow Home', followers: 30950, status: 'connected' },
    { id: 'ch-hh-yt', brandId: 'hh', network: 'youtube', handle: 'Hollow Home', followers: 18700, status: 'expiring', expiresInDays: 2 },
    { id: 'ch-vg-ig', brandId: 'vg', network: 'instagram', handle: '@vantagegarage', followers: 74300, status: 'connected' },
    { id: 'ch-vg-yt', brandId: 'vg', network: 'youtube', handle: 'Vantage Garage', followers: 129800, status: 'connected' },
    { id: 'ch-vg-tt', brandId: 'vg', network: 'tiktok', handle: '@vantagegarage', followers: 201500, status: 'connected' },
    { id: 'ch-vg-x', brandId: 'vg', network: 'x', handle: '@vantagegarage', followers: 15240, status: 'connected' },
    { id: 'ch-vg-fb', brandId: 'vg', network: 'facebook', handle: 'Vantage Garage', followers: 22100, status: 'disconnected' },
    { id: 'ch-wb-ig', brandId: 'wb', network: 'instagram', handle: '@wildroot', followers: 56800, status: 'connected' },
    { id: 'ch-wb-tt', brandId: 'wb', network: 'tiktok', handle: '@wildroot', followers: 41200, status: 'connected' },
    { id: 'ch-wb-pin', brandId: 'wb', network: 'pinterest', handle: '@wildroot', followers: 23900, status: 'connected' },
    { id: 'ch-wb-th', brandId: 'wb', network: 'threads', handle: '@wildroot', followers: 7400, status: 'connected' },
    { id: 'ch-ns-li', brandId: 'ns', network: 'linkedin', handle: 'Northlight Studio', followers: 8650, status: 'connected' },
    { id: 'ch-ns-x', brandId: 'ns', network: 'x', handle: '@northlightstudio', followers: 4310, status: 'connected' },
  ],
  /* Brands' websites (not in the reference): Vantage Garage and Wildroot run a second
     site, Northlight Studio has none. Their demo traffic comes from webAnalytics.ts. */
  websites: [
    { id: 'web-eo', brandId: 'eo', domain: 'emberandoak.com', demo: true },
    { id: 'web-hh', brandId: 'hh', domain: 'hollowhome.com', demo: true },
    { id: 'web-vg', brandId: 'vg', domain: 'vantagegarage.com', demo: true },
    { id: 'web-vg-book', brandId: 'vg', domain: 'book.vantagegarage.com', demo: true },
    { id: 'web-wb', brandId: 'wb', domain: 'wildroot.co', demo: true },
    { id: 'web-wb-ritual', brandId: 'wb', domain: 'springritual.wildroot.co', demo: true },
  ],
  posts,
  analytics: { series: SERIES, accounts: ACCOUNT_STATS, networkTrends: NETWORK_TRENDS, heat: HEAT },
  reports: [],
  bestTimes: BEST_TIMES,
  conversations,
  keywords,
  mentions,
  competitors,
  /* The brand libraries: photos with their tags, stars and who added them, caption templates and hashtag sets. */
  media: [
    { seed: 'ember-latte', brandId: 'eo', title: 'Latte art, close', tags: ['latte', 'cafe'], starred: true, width: 900, height: 603, addedAt: '2026-10-02T00:00:00Z', addedBy: 'freya' },
    { seed: 'ember-pour', brandId: 'eo', title: 'Milk pour', tags: ['latte', 'process'], width: 725, height: 900, addedAt: '2026-10-19T00:00:00Z', addedBy: 'elise' },
    { seed: 'ember-roastery', brandId: 'eo', title: 'The roastery', tags: ['roastery', 'behind the scenes'], width: 900, height: 502, addedAt: '2026-08-16T00:00:00Z', addedBy: 'freya' },
    { seed: 'ember-shot', brandId: 'eo', title: 'Espresso pull', tags: ['espresso', 'process'], width: 725, height: 900, addedAt: '2026-10-21T00:00:00Z', addedBy: 'omar' },
    { seed: 'ember-weigh', brandId: 'eo', title: 'Weighing the dose', tags: ['process', 'beans'], width: 725, height: 900, addedAt: '2026-09-18T00:00:00Z', addedBy: 'nia' },
    { seed: 'hollow-chair', brandId: 'hh', title: 'Bouclé lounge chair', tags: ['product', 'chair'], starred: true, width: 720, height: 900, addedAt: '2026-08-23T00:00:00Z', addedBy: 'omar' },
    { seed: 'hollow-lamp', brandId: 'hh', title: 'Pleat table lamp', tags: ['product', 'lighting'], width: 720, height: 900, addedAt: '2026-08-23T00:00:00Z', addedBy: 'omar' },
    { seed: 'hollow-throw', brandId: 'hh', title: 'Wool throw', tags: ['product', 'textiles'], width: 720, height: 900, addedAt: '2026-09-20T00:00:00Z', addedBy: 'omar' },
    { seed: 'hollow-sofa', brandId: 'hh', title: 'Friends on the Låg sofa', tags: ['lifestyle', 'sofa'], width: 900, height: 600, addedAt: '2026-10-04T00:00:00Z', addedBy: 'freya' },
    { seed: 'hollow-detail', brandId: 'hh', title: 'Oak side table', tags: ['product', 'detail'], width: 900, height: 900, addedAt: '2026-08-29T00:00:00Z', addedBy: 'omar' },
    { seed: 'hollow-room', brandId: 'hh', title: 'Reading corner', tags: ['interior', 'chair'], width: 720, height: 900, addedAt: '2026-10-26T00:00:00Z', addedBy: 'elise' },
    { seed: 'hollow-living', brandId: 'hh', title: 'Living room, full set', tags: ['interior', 'campaign'], width: 900, height: 600, addedAt: '2026-09-13T00:00:00Z', addedBy: 'elise' },
    { seed: 'vantage-gauge', brandId: 'vg', title: 'Redline', tags: ['detail', 'night'], starred: true, width: 720, height: 900, addedAt: '2026-10-24T00:00:00Z', addedBy: 'nia' },
    { seed: 'vantage-wheel', brandId: 'vg', title: 'Fresh ceramic coat', tags: ['wheels', 'detail'], width: 900, height: 675, addedAt: '2026-08-19T00:00:00Z', addedBy: 'elise' },
    { seed: 'vantage-night', brandId: 'vg', title: 'Parking deck reveal', tags: ['reveal', 'night'], width: 900, height: 675, addedAt: '2026-08-18T00:00:00Z', addedBy: 'freya' },
    { seed: 'vantage-lift', brandId: 'vg', title: 'Wheel balancing', tags: ['workshop', 'wheels'], width: 720, height: 900, addedAt: '2026-09-07T00:00:00Z', addedBy: 'omar' },
    { seed: 'vantage-drive', brandId: 'vg', title: 'Delivery drive', tags: ['customer', 'drive'], width: 720, height: 900, addedAt: '2026-09-01T00:00:00Z', addedBy: 'freya' },
    { seed: 'vantage-engine', brandId: 'vg', title: 'Engine bay detail', tags: ['workshop', 'engine'], width: 900, height: 675, addedAt: '2026-09-10T00:00:00Z', addedBy: 'freya' },
    { seed: 'wild-daisy', brandId: 'wb', title: 'Daisy bath', tags: ['ritual', 'flowers'], starred: true, width: 900, height: 599, addedAt: '2026-09-16T00:00:00Z', addedBy: 'freya' },
    { seed: 'wild-dried', brandId: 'wb', title: 'Dried botanicals', tags: ['ingredients', 'flatlay'], width: 600, height: 900, addedAt: '2026-09-30T00:00:00Z', addedBy: 'omar' },
    { seed: 'wild-dropper', brandId: 'wb', title: 'Facial oil drop', tags: ['product', 'oil'], width: 900, height: 599, addedAt: '2026-08-17T00:00:00Z', addedBy: 'nia' },
    { seed: 'wild-petals', brandId: 'wb', title: 'Rose petals', tags: ['ingredients'], width: 600, height: 900, addedAt: '2026-09-27T00:00:00Z', addedBy: 'nia' },
    { seed: 'wild-bloom', brandId: 'wb', title: 'Rose & jasmine', tags: ['ingredients', 'flowers'], width: 671, height: 900, addedAt: '2026-10-11T00:00:00Z', addedBy: 'freya' },
    { seed: 'wild-vials', brandId: 'wb', title: 'Tincture vials', tags: ['product', 'lab'], width: 900, height: 596, addedAt: '2026-08-22T00:00:00Z', addedBy: 'omar' },
    { seed: 'wild-golden', brandId: 'wb', title: 'Golden hour dropper', tags: ['product', 'campaign'], width: 599, height: 900, addedAt: '2026-10-14T00:00:00Z', addedBy: 'nia' },
  ],
  templates: [
    { id: 't1', brandId: null, name: 'Launch countdown', text: "In {days} days: {product}. Turn on notifications so you’re first in line." },
    { id: 't2', brandId: null, name: 'Giveaway rules', text: "GIVEAWAY 🎁 Win {prize}.\n1. Follow {handle}\n2. Like this post\n3. Tag a friend\nEnds {date}. Worldwide." },
    { id: 't3', brandId: 'vg', name: 'Before / after', text: "Before → after. {service} on a {car}. {hours} hours in the bay." },
    { id: 't4', brandId: 'eo', name: 'New origin', text: "New in: {origin}. Tastes like {notes}. Roasted {day}, ships {ship}." },
  ],
  hashtagSets: [
    { id: 'h1', brandId: 'eo', name: 'Coffee core', tags: ['#specialtycoffee', '#slowcoffee', '#portlandcoffee', '#pourover', '#coffeeroasters'] },
    { id: 'h2', brandId: 'hh', name: 'Interiors', tags: ['#scandihome', '#interiordesign', '#slowliving', '#boucle', '#danishdesign'] },
    { id: 'h3', brandId: 'vg', name: 'Detailing', tags: ['#ceramiccoating', '#paintcorrection', '#detailing', '#carsofinstagram', '#austincars'] },
    { id: 'h4', brandId: 'wb', name: 'Skin rituals', tags: ['#cleanbeauty', '#botanicalskincare', '#facialoil', '#selfcareritual', '#lisbon'] },
  ],
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
    { id: 'au1', actorId: 'elise', kind: 'approval', action: { type: 'approved', excerpt: 'New harvest from Huila…', brandId: 'eo' }, at: minutesBefore(14) },
    { id: 'au2', actorId: 'malik', kind: 'channel', action: { type: 'reconnected', brandId: 'hh', network: 'pinterest' }, at: minutesBefore(2 * 60) },
    { id: 'au3', actorId: 'haruto', kind: 'review', action: { type: 'requestedChanges', brandId: 'vg' }, at: minutesBefore(5 * 60) },
    { id: 'au4', actorId: 'camila', kind: 'member', action: { type: 'invited', name: 'Sara Whitfield', role: 'editor' }, at: minutesBefore(7 * 60) },
    { id: 'au5', actorId: 'malik', kind: 'permission', action: { type: 'grantedPermission', role: 'community', permission: 'inbox.assign' }, at: minutesBefore(9 * 60) },
    { id: 'au6', actorId: 'omar', kind: 'schedule', action: { type: 'scheduled', count: 3, brandId: 'vg' }, at: minutesBefore(11 * 60) },
    { id: 'au7', actorId: 'ines', kind: 'inbox', action: { type: 'closedConversations', count: 14 }, at: minutesBefore(13 * 60) },
  ],
  notifications: { unread: 4 },
}
