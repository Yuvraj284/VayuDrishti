/* ───────────────────────────────────────────────────────────────
   NORTH INDIAN OCEAN COASTLINE
   Coarse but real coastlines for the basin overview plot, so track
   charts sit on actual geography rather than decorative shapes.
   Each polyline is a list of [longitude, latitude] pairs, generalised
   to roughly 0.5° — enough to be recognisable at overview scale.
   ─────────────────────────────────────────────────────────────── */

export type Coast = [number, number][]

/** Arabian peninsula — Gulf of Aden east to the Strait of Hormuz. */
export const ARABIA: Coast = [
  [43.3, 12.6], [44.6, 12.7], [45.9, 13.0], [47.2, 13.6], [48.6, 14.0],
  [49.9, 14.5], [51.2, 15.2], [52.3, 15.6], [53.2, 16.6], [54.4, 17.0],
  [55.3, 17.4], [56.4, 17.9], [57.5, 18.8], [58.6, 20.0], [59.5, 21.3],
  [59.8, 22.4], [59.0, 23.3], [58.0, 23.7], [57.0, 24.2], [56.4, 25.0],
]

/** Makran coast — Iran and Pakistan into the Indus delta. */
export const MAKRAN: Coast = [
  [56.4, 25.0], [57.8, 25.6], [59.4, 25.4], [61.0, 25.1], [62.5, 25.2],
  [64.0, 25.3], [65.5, 25.1], [66.9, 24.8], [67.9, 24.2], [68.7, 23.8],
]

/** India — Gujarat, down the Konkan and Malabar coasts to Kanyakumari. */
export const INDIA_WEST: Coast = [
  [68.7, 23.8], [69.8, 22.6], [70.9, 22.3], [72.2, 21.7], [72.9, 21.0],
  [72.7, 19.9], [73.1, 18.6], [73.5, 17.4], [74.1, 16.0], [74.8, 14.6],
  [75.6, 13.4], [76.0, 12.0], [76.4, 10.7], [77.0, 9.3], [77.5, 8.1],
]

/** India — Coromandel coast north to the Ganges delta. */
export const INDIA_EAST: Coast = [
  [77.5, 8.1], [78.3, 9.0], [79.3, 10.0], [79.9, 11.3], [80.3, 13.1],
  [80.3, 14.4], [80.9, 15.7], [81.7, 16.3], [82.6, 17.0], [83.5, 17.7],
  [84.6, 18.5], [85.6, 19.5], [86.7, 20.4], [87.4, 21.3], [88.2, 21.6],
]

/** Bangladesh and the Arakan coast of Myanmar. */
export const BENGAL_EAST: Coast = [
  [88.2, 21.6], [89.3, 22.1], [90.4, 22.4], [91.3, 22.6], [91.9, 22.2],
  [92.2, 21.2], [92.7, 20.3], [93.4, 19.3], [94.0, 18.2], [94.4, 17.0],
  [94.7, 16.0], [95.4, 15.9], [96.2, 16.5], [97.0, 16.5],
]

/** Sri Lanka. */
export const SRI_LANKA: Coast = [
  [79.9, 9.8], [80.8, 9.3], [81.3, 8.5], [81.9, 7.3], [81.7, 6.4],
  [80.9, 5.95], [80.1, 6.0], [79.8, 6.9], [79.7, 8.2], [79.9, 9.8],
]

/** Andaman and Nicobar chain, heavily generalised. */
export const ANDAMANS: Coast = [
  [92.8, 13.5], [93.0, 12.6], [92.7, 11.7], [92.6, 10.6],
]
export const NICOBARS: Coast = [
  [93.5, 8.3], [93.8, 7.3], [93.6, 6.9],
]

/** Maldives ridge — a line of atolls, drawn as a hairline. */
export const MALDIVES: Coast = [
  [73.0, 7.1], [73.2, 5.5], [73.4, 3.8], [73.2, 1.8], [73.1, 0.3],
]

export const COASTLINES: { path: Coast; closed: boolean }[] = [
  { path: ARABIA, closed: false },
  { path: MAKRAN, closed: false },
  { path: INDIA_WEST, closed: false },
  { path: INDIA_EAST, closed: false },
  { path: BENGAL_EAST, closed: false },
  { path: SRI_LANKA, closed: true },
  { path: ANDAMANS, closed: false },
  { path: NICOBARS, closed: false },
  { path: MALDIVES, closed: false },
]

/** Landmass fill — India plus the peninsula, as one closed ring. */
export const INDIA_LANDMASS: Coast = [
  ...INDIA_WEST,
  ...INDIA_EAST.slice(1),
  [88.2, 24.5], [84.0, 25.5], [79.0, 26.0], [74.0, 25.0], [70.5, 25.5],
  [68.7, 23.8],
]

export const ARABIA_LANDMASS: Coast = [
  ...ARABIA,
  [56.4, 26.5], [52.0, 25.5], [48.0, 25.0], [44.0, 22.0],
  [43.0, 17.0], [43.3, 12.6],
]

/** Cities used as coastal reference points on the basin chart. */
export const REFERENCE_POINTS: { name: string; lon: number; lat: number }[] = [
  { name: 'Mumbai', lon: 72.88, lat: 19.08 },
  { name: 'Chennai', lon: 80.27, lat: 13.08 },
  { name: 'Gopalpur', lon: 84.92, lat: 19.27 },
  { name: 'Chittagong', lon: 91.83, lat: 22.36 },
  { name: 'Al Mukalla', lon: 49.13, lat: 14.54 },
]
