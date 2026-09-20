/* ───────────────────────────────────────────────────────────────
   V1 INFERENCE CLIENT

   Talks to the deployed Lambda behind API Gateway. The service owns
   normalisation and the decision threshold; this module sends raw
   physical values and reports back exactly what came out, without
   re-deriving the class locally.
   ─────────────────────────────────────────────────────────────── */

const BASE = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

export const API_CONFIGURED = BASE.length > 0
export const API_BASE = BASE

export interface InferenceResult {
  probability: number
  prediction: string
  is_cyclone: boolean
  threshold: number
  margin: number
  model_version: string
  model_source: string
  checkpoint_epoch: number | null
  input_shape: number[]
  inference_ms: number
  request_id?: string
}

export class InferenceError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'InferenceError'
    this.status = status
  }
}

/** POST one [10, 80, 80] grid of raw physical values. */
export async function runInference(
  grid: number[][][],
  requestId?: string,
  timeoutMs = 45000,
): Promise<InferenceResult> {
  if (!API_CONFIGURED) {
    throw new InferenceError('VITE_API_URL is not set — the inference API is not configured.')
  }

  // The first call of the day pays a container cold start, so the timeout is
  // deliberately generous rather than the usual few seconds.
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)

  try {
    const res = await fetch(`${BASE}/predict`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ grid, request_id: requestId }),
      signal: ctl.signal,
    })

    const text = await res.text()
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      throw new InferenceError(`unexpected response from the API (HTTP ${res.status})`, res.status)
    }

    if (!res.ok) {
      const msg = (body as { message?: string })?.message ?? `HTTP ${res.status}`
      throw new InferenceError(msg, res.status)
    }

    const result = body as InferenceResult
    if (typeof result.probability !== 'number') {
      throw new InferenceError('response did not include a probability')
    }
    return result
  } catch (err) {
    if (err instanceof InferenceError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new InferenceError(`the API did not respond within ${Math.round(timeoutMs / 1000)}s`)
    }
    throw new InferenceError(
      err instanceof Error ? err.message : 'could not reach the inference API',
    )
  } finally {
    clearTimeout(timer)
  }
}

/** Liveness plus the served model's identity. */
export async function health(): Promise<Record<string, unknown>> {
  if (!API_CONFIGURED) throw new InferenceError('VITE_API_URL is not set')
  const res = await fetch(`${BASE}/health`)
  if (!res.ok) throw new InferenceError(`health check failed (HTTP ${res.status})`, res.status)
  return res.json()
}
