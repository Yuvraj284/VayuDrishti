import { useEffect, useRef } from 'react'
import type { Channel } from '../../data/model'

/**
 * Preview of one input channel.
 *
 * Mock data — but shaped like the real thing rather than random noise: the
 * tensor is an 80×80 window centred on a candidate system, so each field
 * carries the signature its variable would actually show there (a pressure
 * low, a wind dipole, a humidity core) under fractal turbulence.
 *
 * Drawn once at 80×80, the grid's true resolution, and left for the browser
 * to upscale.
 */

const N = 80

type Structure = 'low' | 'high' | 'dipole-u' | 'dipole-v' | 'spiral'

/** Which spatial signature each channel shows at the centre of the window. */
const STRUCTURE: Record<string, Structure> = {
  SST: 'high',
  MSLP: 'low',
  U850: 'dipole-u',
  V850: 'dipole-v',
  U200: 'dipole-v',
  V200: 'dipole-u',
  RH700: 'high',
  VORT850: 'spiral',
  OLR: 'low',
  TCWV: 'high',
}

function hash(x: number, y: number, s: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453
  return n - Math.floor(n)
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function noise(x: number, y: number, s: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = smooth(x - xi)
  const yf = smooth(y - yi)
  const a = hash(xi, yi, s)
  const b = hash(xi + 1, yi, s)
  const c = hash(xi, yi + 1, s)
  const d = hash(xi + 1, yi + 1, s)
  return (a * (1 - xf) + b * xf) * (1 - yf) + (c * (1 - xf) + d * xf) * yf
}

function fbm(x: number, y: number, s: number): number {
  let v = 0
  let amp = 0.5
  let f = 1
  for (let o = 0; o < 4; o++) {
    v += noise(x * f, y * f, s + o * 13) * amp
    amp *= 0.5
    f *= 2.07
  }
  return v
}

function structureValue(kind: Structure, nx: number, ny: number): number {
  const r = Math.sqrt(nx * nx + ny * ny)
  const a = Math.atan2(ny, nx)
  const core = Math.exp(-r * r * 3.2)

  switch (kind) {
    case 'low':
      return 1 - core
    case 'high':
      return core
    case 'dipole-u':
      return 0.5 + 0.5 * Math.sin(a) * Math.min(1, r * 2.6) * Math.exp(-r * r * 1.6)
    case 'dipole-v':
      return 0.5 - 0.5 * Math.cos(a) * Math.min(1, r * 2.6) * Math.exp(-r * r * 1.6)
    case 'spiral': {
      const spiral = Math.sin(a * 2 + Math.log(Math.max(r, 0.05)) / 0.4)
      return 0.5 + 0.5 * spiral * Math.exp(-r * r * 2.2)
    }
  }
}

function mix(a: string, b: string, t: number): [number, number, number] {
  const p = (h: string): [number, number, number] => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [r1, g1, b1] = p(a)
  const [r2, g2, b2] = p(b)
  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  ]
}

interface FieldTileProps {
  channel: Channel
  index: number
  /** Re-renders the field with a new realisation when this changes. */
  epoch?: number
}

export default function FieldTile({ channel, index, epoch = 0 }: FieldTileProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const seed = index * 37 + 11 + epoch * 101
    const kind = STRUCTURE[channel.code] ?? 'high'
    const img = ctx.createImageData(N, N)

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const nx = (x / N - 0.5) * 2
        const ny = (y / N - 0.5) * 2

        const turbulence = fbm(x / 13 + seed, y / 13 + seed * 0.7, seed)
        const signal = structureValue(kind, nx, ny)
        const v = Math.min(1, Math.max(0, signal * 0.62 + turbulence * 0.52 - 0.06))

        const [r, g, b] = mix(channel.ramp[0], channel.ramp[1], v)
        const i = (y * N + x) * 4
        img.data[i] = r
        img.data[i + 1] = g
        img.data[i + 2] = b
        img.data[i + 3] = 255
      }
    }

    ctx.putImageData(img, 0, 0)
  }, [channel, index, epoch])

  return <canvas ref={ref} width={N} height={N} className="field-tile__canvas" aria-hidden="true" />
}
