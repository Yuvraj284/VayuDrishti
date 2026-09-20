import type { Variants } from 'framer-motion'

/**
 * framer-motion v13 types cubic-bezier easing as a fixed 4-tuple, so the
 * curve has to be declared with that type rather than inferred as number[].
 */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** Rise-and-fade. `custom` is the delay in seconds. */
export const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (d: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.95, delay: d, ease: EASE },
  }),
}

/** Shorter throw, for items inside a list. */
export const revealSoft: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (d: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: d, ease: EASE },
  }),
}

/** Horizontal entry, for metric rows. */
export const revealX: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
}

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

export const staggerFast: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

/** Viewport trigger shared by every scroll-revealed block. */
export const inView = { once: true, margin: '-70px' } as const
