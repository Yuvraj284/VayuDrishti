import * as THREE from 'three'

/**
 * Procedural cloud-puff sprite.
 *
 * A pure radial gradient reads as a glowing blob — the thing we are
 * explicitly avoiding. So the alpha mask is a radial falloff multiplied by
 * three octaves of value noise, which gives every puff a torn, irregular
 * edge. Thousands of these overlapping resolve into cloud, not bokeh.
 *
 * Generated once and cached; the canvas is discarded after upload.
 */

let cached: THREE.Texture | null = null

const SIZE = 128

/** Deterministic hash so the sprite is identical across reloads. */
function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return n - Math.floor(n)
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Bilinear value noise on a `grid`-cell lattice. */
function valueNoise(u: number, v: number, grid: number, seed: number): number {
  const x = u * grid
  const y = v * grid
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = smooth(x - xi)
  const yf = smooth(y - yi)

  // Wrap the lattice so the noise tiles — avoids a visible seam on the sprite.
  const w = (n: number) => ((n % grid) + grid) % grid
  const a = hash2(w(xi), w(yi), seed)
  const b = hash2(w(xi + 1), w(yi), seed)
  const c = hash2(w(xi), w(yi + 1), seed)
  const d = hash2(w(xi + 1), w(yi + 1), seed)

  return (a * (1 - xf) + b * xf) * (1 - yf) + (c * (1 - xf) + d * xf) * yf
}

export function getPuffTexture(): THREE.Texture {
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(SIZE, SIZE)
  const data = img.data

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = (x + 0.5) / SIZE
      const v = (y + 0.5) / SIZE

      // Distance from centre, normalised so the sprite fills the quad.
      const dx = u - 0.5
      const dy = v - 0.5
      const d = Math.sqrt(dx * dx + dy * dy) * 2 // 0 at centre, 1 at edge

      // Soft core with a long tail — cloud, not a hard ball.
      let falloff = 1 - d
      falloff = Math.max(0, falloff)
      falloff = falloff * falloff * (0.55 + 0.45 * falloff)

      // Three octaves of tiling value noise erode the silhouette.
      const n =
        valueNoise(u, v, 4, 1) * 0.5 +
        valueNoise(u, v, 8, 2) * 0.32 +
        valueNoise(u, v, 16, 3) * 0.18

      // Erode more at the rim than the core, so the centre stays solid.
      const erosion = 1 - d * 0.85
      const mask = falloff * (0.34 + 0.66 * n) * Math.max(0, erosion)

      // Internal luminance variation — reads as self-shadowing within a puff.
      const lum = 0.74 + 0.26 * n

      const i = (y * SIZE + x) * 4
      const c = Math.round(255 * lum)
      data[i] = c
      data[i + 1] = c
      data[i + 2] = c
      data[i + 3] = Math.round(255 * Math.min(1, mask * 1.18))
    }
  }

  ctx.putImageData(img, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true

  cached = tex
  return tex
}

export function disposePuffTexture(): void {
  cached?.dispose()
  cached = null
}
