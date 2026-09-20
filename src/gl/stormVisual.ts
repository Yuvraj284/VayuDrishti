import { peakKt, strength, type Storm } from '../data/storms'

/* ───────────────────────────────────────────────────────────────
   STORM PARAMETER SYSTEM

   Everything the shader needs to draw one system. Values are derived
   from the archive's real best-track intensity rather than assigned
   per storm by hand, so a 45 kt cyclonic storm and a 120 kt extremely
   severe one are visibly different objects: the strong one carries a
   small, sharp eye and a tightly wound, high-contrast spiral.

   The palette is fixed to the VayuDrishti key — the original bound a
   different colour set to each storm, which would have pulled the
   product away from its own identity.
   ─────────────────────────────────────────────────────────────── */

export interface StormVisual {
  /** Sea colour, linear RGB 0–1. */
  ocean: [number, number, number]
  /** Cloud albedo. */
  cloud: [number, number, number]
  /** Limb halo and rim light. */
  glow: [number, number, number]
  /** Principal rainband arms. */
  arms: number
  /** Log-spiral tightness. Higher winds the bands more. */
  tight: number
  /** Eye radius as a fraction of the sphere radius. */
  eye: number
  /** Angular velocity, rad/s. */
  spin: number
  /** Ambient cloud cover away from the system. */
  cover: number
  /** Rainband contrast — how organised the storm reads. */
  power: number
  /** +1 northern hemisphere (anticlockwise), -1 southern. */
  hemi: number
  /** 0 evenly lit, 1 hard terminator. */
  night: number
  /** Limb halo strength. */
  halo: number
  /** Lightning amplitude in deep convection. */
  flash: number
}

/** VayuDrishti key — deep navy sea, pale cyan cloud, teal-cyan limb. */
const OCEAN: [number, number, number] = [0.012, 0.055, 0.112]
const CLOUD: [number, number, number] = [0.455, 0.535, 0.600]
const GLOW: [number, number, number] = [0.235, 0.620, 0.720]

export const BASE_VISUAL: StormVisual = {
  ocean: OCEAN,
  cloud: CLOUD,
  glow: GLOW,
  arms: 2,
  tight: 2.6,
  eye: 0.078,
  spin: 0.2,
  cover: 0.6,
  power: 1,
  hemi: 1,
  night: 0.92,
  halo: 0.44,
  flash: 1,
}

/**
 * Visual parameters for one archived system.
 *
 * `intensity` is the normalised 35–120 kt strength already used elsewhere in
 * the product, so the 3D view and the track colour ramp stay in agreement.
 */
export function visualForStorm(storm: Storm): StormVisual {
  const t = strength(storm) // 0–1
  const kt = peakKt(storm)

  return {
    ...BASE_VISUAL,
    // A strong storm clears a small, sharp eye; a weak one barely has one.
    eye: 0.130 - 0.050 * t,
    // Better-organised systems wind tighter and show fewer, cleaner arms.
    tight: 1.95 + 0.55 * t,
    arms: kt >= 96 ? 2 : kt >= 64 ? 3 : 4,
    spin: 0.13 + 0.15 * t,
    cover: 0.54 - 0.20 * t,
    power: 0.55 + 0.60 * t,
    // Every system in the archive is North Indian Ocean, so anticlockwise.
    hemi: storm.track[0][0] < 0 ? -1 : 1,
  }
}

/** The hero system. Phailin is the archive's strongest and its cover storm. */
export function heroVisual(storm?: Storm): StormVisual {
  if (!storm) return { ...BASE_VISUAL, eye: 0.068, tight: 3.0, power: 1.25, spin: 0.24 }
  return {
    ...visualForStorm(storm),
    // The hero is the product's first impression — push organisation a little
    // past the literal reading so the spiral is unmistakable at a glance.
    power: Math.min(1.28, visualForStorm(storm).power * 1.10),
    tight: visualForStorm(storm).tight + 0.15,
  }
}

/** Compact preset for the Monitor inset: calmer, no lightning, softer limb. */
export function insetVisual(storm: Storm): StormVisual {
  const v = visualForStorm(storm)
  return { ...v, night: 0.55, halo: 0.5, flash: 0, spin: v.spin * 0.85 }
}
