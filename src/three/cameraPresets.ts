/**
 * Camera poses for the storm.
 *
 * Kept free of any three.js import so a page can reference a preset without
 * pulling the WebGL chunk into its own bundle.
 */

export interface CameraKey {
  /** Scroll progress at which this pose is reached, 0–1. */
  p: number
  pos: [number, number, number]
  look: [number, number, number]
  fov: number
}

/**
 * Establishing wide shot → descent → inside the eye.
 *
 * A cyclone is a very flat object — roughly 1000 km across and 15 km deep — so
 * the establishing shot has to look down on it from a satellite-like elevation
 * (~45°). Any lower and the spiral collapses edge-on into an undifferentiated
 * band. The descent then drops through the outflow and finishes on the floor
 * of the eye, looking up the sloping inner face of the eyewall.
 */
export const HERO_KEYS: CameraKey[] = [
  { p: 0.0, pos: [0, 11.0, 11.4], look: [-1.15, 0.0, 0], fov: 34 },
  { p: 0.40, pos: [0, 6.4, 6.8], look: [-0.55, 0.2, 0], fov: 33 },
  { p: 0.72, pos: [0, 3.1, 3.4], look: [0, 0.35, 0], fov: 33 },
  { p: 0.90, pos: [0, 1.9, 2.3], look: [0, 0.5, 0], fov: 35 },
  { p: 1.0, pos: [0.18, 0.30, 0.48], look: [0.6, 1.25, 1.7], fov: 48 },
]

/** Static three-quarter view for the inspector inset. */
export const INSPECT_KEYS: CameraKey[] = [
  { p: 0, pos: [0, 15.2, 14.6], look: [0, 0.1, 0], fov: 30 },
]
