import type { StageKey } from './stormRenderer'

/* ───────────────────────────────────────────────────────────────
   STAGE PRESETS

   The cinematic arc, expressed as screen-space poses rather than
   camera positions. Scroll interpolates between them continuously,
   so the descent is one unbroken move instead of four snapped
   states — the original stepped between discrete stages.

   Radius grows past the viewport to produce the dive: by the last
   key the sphere is several screens across and the frame sits
   inside the eye.
   ─────────────────────────────────────────────────────────────── */

export const HERO_STAGES: StageKey[] = [
  // Establishing: the whole system, offset right of the title block.
  {
    p: 0,
    pose: (w, h, m) =>
      m
        ? { ex: 0.5 * w, ey: 0.725 * h, R: Math.min(0.88 * w, 0.40 * h), cx: 0, cy: 0.06 }
        : { ex: 0.745 * w, ey: 0.5 * h, R: Math.min(0.36 * w, 0.54 * h), cx: -0.06, cy: 0.08 },
  },
  // Approach: the storm fills the frame, limb leaving the edges.
  {
    p: 0.38,
    pose: (w, h, m) =>
      m
        ? { ex: 0.5 * w, ey: 0.56 * h, R: Math.max(1.35 * w, 0.95 * h), cx: 0, cy: 0.04 }
        : { ex: 0.55 * w, ey: 0.48 * h, R: Math.max(1.05 * w, 1.3 * h), cx: 0, cy: 0.05 },
  },
  // Eyewall: the ring of deep convection spans the viewport.
  {
    p: 0.72,
    pose: (w, h, m) => ({
      ex: (m ? 0.5 : 0.48) * w,
      ey: 0.46 * h,
      R: (m ? 2.2 : 2.0) * Math.max(w, h),
      cx: 0.02,
      cy: 0.02,
    }),
  },
  // Inside the eye.
  {
    p: 1,
    pose: (w, h, m) => ({
      ex: (m ? 0.5 : 0.46) * w,
      ey: 0.45 * h,
      R: (m ? 3.6 : 3.4) * Math.max(w, h),
      cx: 0.02,
      cy: 0.02,
    }),
  },
]

/** Monitor inset — a single static three-quarter view of the whole system. */
export const INSET_STAGES: StageKey[] = [
  {
    p: 0,
    pose: (w, h) => ({
      ex: 0.5 * w,
      ey: 0.5 * h,
      R: Math.min(0.44 * w, 0.68 * h),
      cx: -0.04,
      cy: 0.05,
    }),
  },
]
