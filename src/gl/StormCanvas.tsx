import { useEffect, useMemo, useRef, useState } from 'react'
import { createStormRenderer, type StageKey, type StormRenderer } from './stormRenderer'
import type { StormVisual } from './stormVisual'
import './StormCanvas.css'

/* ───────────────────────────────────────────────────────────────
   Device tiering.

   The cost here is fill rate — the fragment shader runs fbm for
   every covered pixel — so the two levers are resolution and octave
   count. Octaves are compiled in, which is why the tier is decided
   once at mount rather than adapted mid-flight.
   ─────────────────────────────────────────────────────────────── */

type Tier = 'low' | 'mid' | 'high'

function detectTier(): Tier {
  if (typeof window === 'undefined') return 'mid'
  const cores = navigator.hardwareConcurrency ?? 4
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const narrow = window.innerWidth < 820
  if (coarse || narrow || cores <= 4) return 'low'
  if (cores <= 8) return 'mid'
  return 'high'
}

const TIER: Record<Tier, { octaves: number; dprCap: number }> = {
  low: { octaves: 3, dprCap: 1.25 },
  mid: { octaves: 4, dprCap: 1.5 },
  high: { octaves: 6, dprCap: 1.75 },
}

export interface StormCanvasProps {
  className?: string
  stages: StageKey[]
  visual: StormVisual
  /** Scroll progress 0–1, read every frame. A ref, so scrolling never re-renders. */
  progressRef?: React.RefObject<number>
  /** Receives the live eye position each frame — used to pin callouts. */
  onFrame?: (eye: { x: number; y: number; R: number }) => void
  /** Rendering stops entirely while the canvas is off-screen. */
  pauseOffscreen?: boolean
  /** Forces a cheaper tier, for small insets. */
  compact?: boolean
}

export default function StormCanvas({
  className,
  stages,
  visual,
  progressRef,
  onFrame,
  pauseOffscreen = true,
  compact = false,
}: StormCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<StormRenderer | null>(null)
  const [failed, setFailed] = useState(false)

  // Latest values read by the render loop without re-creating the renderer.
  // Written in an effect rather than during render: the loop only reads them
  // on the next frame, which is always after commit.
  const visualRef = useRef(visual)
  const onFrameRef = useRef(onFrame)
  useEffect(() => {
    visualRef.current = visual
  }, [visual])
  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  const [tier] = useState<Tier>(detectTier)
  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
    [],
  )

  const quality = useMemo(() => {
    const base = TIER[tier]
    return compact
      ? { octaves: Math.max(3, base.octaves - 2), dprCap: Math.min(base.dprCap, 1.5) }
      : base
  }, [tier, compact])

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    const renderer = createStormRenderer(canvas, {
      stages,
      getProgress: () => (reduceMotion ? 0 : (progressRef?.current ?? 0)),
      getVisual: () => visualRef.current,
      octaves: quality.octaves,
      dprCap: quality.dprCap,
      reduceMotion,
    })
    rendererRef.current = renderer

    if (!renderer.ok) {
      setFailed(true)
      return () => renderer.destroy()
    }

    renderer.resize()

    const tick = () => onFrameRef.current?.(renderer.eye())

    // With reduced motion the image is static, so the loop is run just long
    // enough to settle and is then released rather than spinning forever.
    let settleTimer = 0
    const runBriefly = () => {
      renderer.start(tick)
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => renderer.stop(), 300)
    }

    const ro = new ResizeObserver(() => {
      renderer.resize()
      if (reduceMotion) runBriefly()
    })
    ro.observe(canvas)

    let visible = true
    const apply = () => {
      if (visible && !document.hidden) {
        if (reduceMotion) runBriefly()
        else renderer.start(tick)
      } else {
        renderer.stop()
      }
    }

    let io: IntersectionObserver | null = null
    if (pauseOffscreen && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting
          apply()
        },
        { rootMargin: '140px' },
      )
      io.observe(host)
    }

    const onVisibility = () => apply()
    document.addEventListener('visibilitychange', onVisibility)

    apply()

    return () => {
      window.clearTimeout(settleTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      ro.disconnect()
      io?.disconnect()
      renderer.destroy()
      rendererRef.current = null
    }
  }, [stages, quality, reduceMotion, pauseOffscreen, progressRef])

  return (
    <div ref={hostRef} className={`storm-canvas ${className ?? ''}`}>
      <canvas ref={canvasRef} className="storm-canvas__el" aria-hidden="true" />
      {failed && <div className="storm-canvas__fallback" />}
    </div>
  )
}
