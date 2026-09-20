/* ───────────────────────────────────────────────────────────────
   CYCLONE FIELD GENERATION
   Builds the resting particle distribution for each layer of the
   storm. Runs once per mount; after that the GPU owns the motion.

   Structure follows the real anatomy of a mature tropical cyclone:
   a clear eye, a sloped eyewall (the "stadium effect"), spiral
   rainbands laid on a logarithmic spiral, and a cirrus outflow
   canopy fanning out above the whole system.
   ─────────────────────────────────────────────────────────────── */

export interface Field {
  positions: Float32Array // xyz resting position
  params: Float32Array // size, seed, brightness, alpha
  count: number
}

/** Mulberry32 — small, fast, seeded. Keeps the storm identical between loads. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Sum of two uniforms ≈ triangular; cheap stand-in for a gaussian. */
function jitter(r: () => number): number {
  return r() + r() - 1
}

export interface CycloneShape {
  /** Radius of the clear eye. */
  eyeR: number
  /** Outer extent of the rainbands. */
  maxR: number
  /** Number of principal spiral arms. */
  arms: number
  /** Logarithmic spiral tightness — smaller winds tighter. */
  tightness: number
  /** 0–1: how organised the storm is. Drives banding contrast and eyewall. */
  organisation: number
}

export const DEFAULT_SHAPE: CycloneShape = {
  eyeR: 1.0,
  maxR: 9.0,
  arms: 2,
  tightness: 0.46,
  organisation: 0.85,
}

/**
 * Main cloud deck and spiral rainbands.
 *
 * Particles are drawn toward logarithmic spiral arms with an angular spread
 * that widens outward, so the banding is crisp near the core and frays at the
 * rim. A fraction ignore the arms entirely and fill the gaps as diffuse
 * overcast — without them the storm looks like a pinwheel rather than cloud.
 */
export function buildDeck(count: number, shape: CycloneShape, seed = 1337): Field {
  const r = rng(seed)
  const positions = new Float32Array(count * 3)
  const params = new Float32Array(count * 4)

  const { eyeR, maxR, arms, tightness, organisation } = shape
  const span = maxR - eyeR
  const diffuseFrac = 0.30 - 0.18 * organisation

  for (let i = 0; i < count; i++) {
    // Density falls off outward — most of the mass sits near the core.
    const rel = Math.pow(r(), 1.55)
    const rad = eyeR + span * rel

    let theta: number
    const onArm = r() > diffuseFrac
    if (onArm) {
      const arm = Math.floor(r() * arms)
      const armPhase = (arm / arms) * Math.PI * 2
      // Log spiral: θ = ln(r / r₀) / b
      const spiral = Math.log(rad / eyeR) / tightness
      const spread = (0.13 + 0.58 * rel) * (1.2 - 0.5 * organisation)
      theta = armPhase + spiral + jitter(r) * spread
    } else {
      theta = r() * Math.PI * 2
    }

    // Vertical structure: a central dense overcast dome that thins outward.
    // Particles bias toward the deck floor, with fewer reaching cloud top.
    const dome = 0.95 * Math.exp(-rel * 2.3)
    const y = -0.14 + dome * Math.pow(r(), 1.35) + jitter(r) * 0.07

    positions[i * 3] = Math.cos(theta) * rad
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = Math.sin(theta) * rad

    // Outer puffs are larger and softer; core puffs small and dense.
    params[i * 4] = (0.27 + 0.70 * rel) * (0.70 + 0.64 * r())
    params[i * 4 + 1] = r()
    params[i * 4 + 2] = (onArm ? 0.98 : 0.78) * (0.86 + 0.30 * r())
    params[i * 4 + 3] = (0.46 - 0.19 * rel) * (0.62 + 0.76 * r())
  }

  return { positions, params, count }
}

/**
 * Eyewall — the ring of deep convection around the eye.
 *
 * Its inner face slopes outward with height (the stadium effect), which is the
 * single most recognisable feature of a strong cyclone seen from above.
 */
export function buildEyewall(count: number, shape: CycloneShape, seed = 907): Field {
  const r = rng(seed)
  const positions = new Float32Array(count * 3)
  const params = new Float32Array(count * 4)

  const { eyeR, organisation } = shape
  const slope = 0.34 + 0.18 * organisation
  const top = 0.95 + 0.30 * organisation
  const thickness = 0.72 - 0.16 * organisation

  for (let i = 0; i < count; i++) {
    // Taller in the middle of the wall, thinning at the very top.
    const h = Math.pow(r(), 0.92)
    const y = -0.22 + h * (top + 0.22)

    const inner = eyeR + slope * (y + 0.22)
    const rad = inner + Math.pow(r(), 1.6) * thickness

    // Mesovortices: the wall is never perfectly axisymmetric.
    const theta = r() * Math.PI * 2
    const meso = 0.86 + 0.14 * Math.sin(theta * 4.0 + 1.1)

    positions[i * 3] = Math.cos(theta) * rad
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = Math.sin(theta) * rad

    params[i * 4] = (0.25 + 0.34 * r()) * (1.0 + 0.5 * h)
    params[i * 4 + 1] = r()
    params[i * 4 + 2] = (1.05 + 0.30 * r()) * meso
    params[i * 4 + 3] = (0.34 + 0.26 * r()) * (0.55 + 0.45 * h)
  }

  return { positions, params, count }
}

/**
 * Cirrus outflow canopy — the thin, fast-spreading anvil above the storm.
 * Wide, faint, loosely wound, and counter-rotating relative to the low-level
 * inflow, which is what sells the system as three-dimensional from any angle.
 */
export function buildCirrus(count: number, shape: CycloneShape, seed = 5501): Field {
  const r = rng(seed)
  const positions = new Float32Array(count * 3)
  const params = new Float32Array(count * 4)

  const { eyeR, maxR } = shape
  const inner = eyeR * 1.5
  const outer = maxR * 1.32
  const span = outer - inner

  for (let i = 0; i < count; i++) {
    const rel = Math.pow(r(), 0.85)
    const rad = inner + span * rel

    // Loosely wound, many-armed — outflow fans rather than bands.
    const arm = Math.floor(r() * 5)
    const spiral = Math.log(rad / inner) / 0.92
    const theta = (arm / 5) * Math.PI * 2 + spiral + jitter(r) * 1.5

    // Sits above the deck, sagging slightly toward the rim.
    const y = 1.02 + Math.pow(r(), 0.8) * 0.95 - rel * 0.42

    positions[i * 3] = Math.cos(theta) * rad
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = Math.sin(theta) * rad

    params[i * 4] = (1.05 + 1.95 * rel) * (0.72 + 0.56 * r())
    params[i * 4 + 1] = r()
    params[i * 4 + 2] = 0.72 + 0.34 * r()
    params[i * 4 + 3] = (0.16 - 0.07 * rel) * (0.55 + 0.80 * r())
  }

  return { positions, params, count }
}

/**
 * Low scud — torn fragments skimming the sea surface inside and around the
 * eye. A small layer, but it gives the eye a floor and a sense of depth.
 */
export function buildScud(count: number, shape: CycloneShape, seed = 313): Field {
  const r = rng(seed)
  const positions = new Float32Array(count * 3)
  const params = new Float32Array(count * 4)

  const { eyeR, maxR } = shape

  for (let i = 0; i < count; i++) {
    const rad = eyeR * 0.12 + Math.pow(r(), 0.7) * (maxR * 0.55)
    const theta = r() * Math.PI * 2
    const y = -0.46 + r() * 0.16

    positions[i * 3] = Math.cos(theta) * rad
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = Math.sin(theta) * rad

    params[i * 4] = 0.34 + 0.72 * r()
    params[i * 4 + 1] = r()
    params[i * 4 + 2] = 0.42 + 0.26 * r()
    params[i * 4 + 3] = 0.10 + 0.14 * r()
  }

  return { positions, params, count }
}
