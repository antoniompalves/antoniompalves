/**
 * Single swap point for imagery. The reference ships its own licensed photos;
 * this recreation uses seeded placeholders instead. Point these helpers at your
 * own CDN or /public folder to drop real assets in without touching components.
 */

export const photo = (seed: string, size = 720) =>
  `https://picsum.photos/seed/murmura-${seed}/${size}/${size}`

export const avatar = (seed: string, size = 96) =>
  `https://i.pravatar.cc/${size}?u=murmura-${seed}`
