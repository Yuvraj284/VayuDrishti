/* ───────────────────────────────────────────────────────────────
   ARCHIVE INPUT SAMPLES

   The browser cannot synthesise a real [10, 80, 80] meteorological
   window — the field previews on the Predict page are procedural
   decoration, not data. Feeding those to the model would return a
   number that looks like a prediction and means nothing.

   So inference runs on real windows lifted out of the held-out test
   split, shipped as raw Float32 (10 x 80 x 80 x 4 = 256,000 bytes)
   and fetched only when the user asks for one.
   ─────────────────────────────────────────────────────────────── */

export interface InputSample {
  id: string
  /** Index within test.nc. */
  index: number
  label: string
  /** Ground-truth class from the best-track archive. */
  trueLabel: 0 | 1
  /** Static asset path, raw little-endian Float32, channel-major. */
  file: string
  note: string
}

export const INPUT_SAMPLES: InputSample[] = [
  {
    id: 'test-0000',
    index: 0,
    label: 'Test 0000',
    trueLabel: 1,
    file: '/samples/test-0000.f32',
    note: 'Cyclonic window the classifier misses — one of the 369 documented false negatives at threshold 0.51.',
  },
  {
    id: 'test-0001',
    index: 1,
    label: 'Test 0001',
    trueLabel: 1,
    file: '/samples/test-0001.f32',
    note: 'Cyclonic window the classifier identifies with high confidence.',
  },
]

export const GRID_SHAPE = [10, 80, 80] as const
const VALUES = GRID_SHAPE[0] * GRID_SHAPE[1] * GRID_SHAPE[2]

/**
 * Loads a sample and reshapes it into the nested array the API expects.
 * NaN marks a masked cell; the service replaces it with the training mean,
 * exactly as the evaluation pipeline does.
 */
export async function loadSample(sample: InputSample): Promise<number[][][]> {
  const res = await fetch(sample.file)
  if (!res.ok) throw new Error(`could not load ${sample.file} (HTTP ${res.status})`)

  const raw = new Float32Array(await res.arrayBuffer())
  if (raw.length !== VALUES) {
    throw new Error(`${sample.file}: expected ${VALUES} values, got ${raw.length}`)
  }

  const [C, H, W] = GRID_SHAPE
  const grid: number[][][] = []
  for (let c = 0; c < C; c++) {
    const channel: number[][] = []
    for (let y = 0; y < H; y++) {
      const row: number[] = []
      for (let x = 0; x < W; x++) row.push(raw[c * H * W + y * W + x])
      channel.push(row)
    }
    grid.push(channel)
  }
  return grid
}
