/* ───────────────────────────────────────────────────────────────
   INPUT GRID PARSING AND VALIDATION

   The model takes one [10, 80, 80] window of raw physical values in
   a fixed channel order. Everything here runs client-side so a
   malformed file is rejected before it costs an API call, and the
   reason is specific enough to act on.

   Three formats are accepted, in the order a user is likely to have
   them: NumPy .npy (what the preprocessing pipeline writes), raw
   little-endian Float32, and JSON.

   NaN is allowed and meaningful — it marks a masked cell, which the
   service replaces with the channel's training mean, exactly as the
   evaluation pipeline does.
   ─────────────────────────────────────────────────────────────── */

import { CHANNEL_CODES } from './model'

export const GRID_SHAPE = [10, 80, 80] as const
export const [CHANNELS, HEIGHT, WIDTH] = GRID_SHAPE
export const VALUE_COUNT = CHANNELS * HEIGHT * WIDTH // 64,000
export const F32_BYTES = VALUE_COUNT * 4 // 256,000

/** Channel order the network was trained with. A permutation is undetectable. */
export const CHANNEL_ORDER = CHANNEL_CODES

export type GridFormat = 'npy' | 'float32' | 'json'

export interface ParsedGrid {
  grid: number[][][]
  format: GridFormat
  fileName: string
  bytes: number
  /** Masked cells, passed through as NaN for the service to fill. */
  nanCount: number
  min: number
  max: number
}

export class GridValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GridValidationError'
  }
}

/* ── NumPy .npy ─────────────────────────────────────────────────────────── */

const NPY_MAGIC = [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59] // \x93NUMPY

function looksLikeNpy(bytes: Uint8Array): boolean {
  return NPY_MAGIC.every((b, i) => bytes[i] === b)
}

function parseNpy(buf: ArrayBuffer): Float64Array | Float32Array {
  const bytes = new Uint8Array(buf)
  const view = new DataView(buf)

  const major = bytes[6]
  // v1 stores a 2-byte header length, v2/v3 use 4 bytes.
  const headerLenSize = major === 1 ? 2 : 4
  const headerLen =
    major === 1 ? view.getUint16(8, true) : view.getUint32(8, true)
  const headerStart = 8 + headerLenSize
  const header = new TextDecoder().decode(bytes.subarray(headerStart, headerStart + headerLen))

  const descr = /'descr'\s*:\s*'([^']+)'/.exec(header)?.[1]
  const fortran = /'fortran_order'\s*:\s*(True|False)/.exec(header)?.[1]
  const shapeRaw = /'shape'\s*:\s*\(([^)]*)\)/.exec(header)?.[1] ?? ''
  const shape = shapeRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)

  if (!descr) throw new GridValidationError('.npy header is missing a dtype descriptor')
  if (fortran === 'True') {
    throw new GridValidationError(
      'Fortran-ordered .npy is not supported — re-save with np.ascontiguousarray()',
    )
  }
  if (descr !== '<f4' && descr !== '<f8') {
    throw new GridValidationError(
      `.npy dtype is ${descr}; expected little-endian float32 (<f4) or float64 (<f8)`,
    )
  }
  if (shape.length !== 3 || shape[0] !== CHANNELS || shape[1] !== HEIGHT || shape[2] !== WIDTH) {
    throw new GridValidationError(
      `.npy shape is [${shape.join(', ')}]; expected [${GRID_SHAPE.join(', ')}]`,
    )
  }

  const dataStart = headerStart + headerLen
  return descr === '<f4'
    ? new Float32Array(buf.slice(dataStart))
    : new Float64Array(buf.slice(dataStart))
}

/* ── JSON ───────────────────────────────────────────────────────────────── */

function parseJson(text: string): Float64Array {
  let doc: unknown
  try {
    doc = JSON.parse(text)
  } catch (err) {
    throw new GridValidationError(
      `not valid JSON: ${err instanceof Error ? err.message : 'parse failed'}`,
    )
  }

  // Accept either a bare nested array or the API's own {"grid": ...} envelope.
  const raw = Array.isArray(doc) ? doc : (doc as { grid?: unknown })?.grid
  if (!Array.isArray(raw)) {
    throw new GridValidationError('JSON must be a [10][80][80] array, or {"grid": [...]}')
  }
  if (raw.length !== CHANNELS) {
    throw new GridValidationError(`JSON has ${raw.length} channels; expected ${CHANNELS}`)
  }

  const out = new Float64Array(VALUE_COUNT)
  let k = 0
  for (let c = 0; c < CHANNELS; c++) {
    const channel = raw[c]
    if (!Array.isArray(channel) || channel.length !== HEIGHT) {
      throw new GridValidationError(
        `channel ${c} has ${Array.isArray(channel) ? channel.length : 'no'} rows; expected ${HEIGHT}`,
      )
    }
    for (let y = 0; y < HEIGHT; y++) {
      const row = channel[y]
      if (!Array.isArray(row) || row.length !== WIDTH) {
        throw new GridValidationError(
          `channel ${c} row ${y} has ${Array.isArray(row) ? row.length : 'no'} values; expected ${WIDTH}`,
        )
      }
      for (let x = 0; x < WIDTH; x++) {
        const v = row[x]
        // null is the JSON spelling of a masked cell.
        out[k++] = v === null ? NaN : typeof v === 'number' ? v : Number.NaN
        if (v !== null && typeof v !== 'number') {
          throw new GridValidationError(
            `channel ${c} [${y}][${x}] is ${typeof v}; expected a number or null`,
          )
        }
      }
    }
  }
  return out
}

/* ── Public entry point ─────────────────────────────────────────────────── */

export async function parseGridFile(file: File): Promise<ParsedGrid> {
  if (file.size === 0) throw new GridValidationError('file is empty')
  if (file.size > 8 * 1024 * 1024) {
    throw new GridValidationError(
      `file is ${(file.size / 1048576).toFixed(1)} MB; a ${GRID_SHAPE.join('x')} window is at most a few MB`,
    )
  }

  const buf = await file.arrayBuffer()
  const head = new Uint8Array(buf, 0, Math.min(8, buf.byteLength))
  const name = file.name.toLowerCase()

  let values: Float32Array | Float64Array
  let format: GridFormat

  if (looksLikeNpy(head)) {
    values = parseNpy(buf)
    format = 'npy'
  } else if (name.endsWith('.json') || head[0] === 0x7b || head[0] === 0x5b) {
    values = parseJson(new TextDecoder().decode(buf))
    format = 'json'
  } else {
    // Anything else is treated as a raw Float32 dump.
    if (buf.byteLength !== F32_BYTES) {
      throw new GridValidationError(
        `raw Float32 input must be exactly ${F32_BYTES.toLocaleString()} bytes ` +
          `(${GRID_SHAPE.join(' x ')} x 4); this file is ${buf.byteLength.toLocaleString()}`,
      )
    }
    values = new Float32Array(buf)
    format = 'float32'
  }

  if (values.length !== VALUE_COUNT) {
    throw new GridValidationError(
      `parsed ${values.length.toLocaleString()} values; expected ${VALUE_COUNT.toLocaleString()}`,
    )
  }

  // Reshape channel-major and gather the summary the UI reports back.
  const grid: number[][][] = []
  let nanCount = 0
  let min = Infinity
  let max = -Infinity

  for (let c = 0; c < CHANNELS; c++) {
    const channel: number[][] = []
    for (let y = 0; y < HEIGHT; y++) {
      const row: number[] = []
      for (let x = 0; x < WIDTH; x++) {
        const v = values[c * HEIGHT * WIDTH + y * WIDTH + x]
        if (Number.isNaN(v)) nanCount++
        else {
          if (v < min) min = v
          if (v > max) max = v
        }
        row.push(v)
      }
      channel.push(row)
    }
    grid.push(channel)
  }

  if (nanCount === VALUE_COUNT) {
    throw new GridValidationError('every value is masked — there is nothing to classify')
  }

  return { grid, format, fileName: file.name, bytes: buf.byteLength, nanCount, min, max }
}
