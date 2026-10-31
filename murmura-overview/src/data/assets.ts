/**
 * Single swap point for imagery. The reference ships its own licensed photos;
 * this recreation uses seeded placeholders instead. Point these helpers at your
 * own CDN or /public folder to drop real assets in without touching components.
 */

/** Seed prefix of the placeholders, from before the app was renamed; changing it would change every picture. */
const SEED = 'murmura'

export const photo = (seed: string, size = 720) =>
  `https://picsum.photos/seed/${SEED}-${seed}/${size}/${size}`

/** A post's first photo at `size`, or undefined for text-only posts. */
export const coverPhoto = (post: { media: string[] }, size?: number) => (post.media[0] ? photo(post.media[0], size) : undefined)

export const avatar = (seed: string, size = 96) =>
  `https://i.pravatar.cc/${size}?u=${SEED}-${seed}`

/** Photo of someone met through listening: "elena_m_rquez" gets the inbox contact "elena.m.rquez"'s picture. */
export const personPhoto = (handle: string) => avatar(handle.replace(/_/g, '.'))
