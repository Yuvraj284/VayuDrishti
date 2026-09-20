import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import CycloneSystem from './CycloneSystem'
import { HERO_KEYS, type CameraKey } from './cameraPresets'
import type { CycloneShape } from './cycloneField'
import './StormCanvas.css'

/* ───────────────────────────────────────────────────────────────
   Device tiering.
   The storm is a particle system, so the two levers that matter are
   instance count and resolution. Both are set once, from what the
   device tells us, rather than adapting mid-flight.
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

const TIER: Record<Tier, { density: number; dpr: [number, number] }> = {
  low: { density: 0.32, dpr: [1, 1.25] },
  mid: { density: 0.62, dpr: [1, 1.5] },
  high: { density: 1, dpr: [1, 1.75] },
}

export interface StormCanvasProps {
  className?: string
  cameraKeys?: CameraKey[]
  progressRef?: React.RefObject<number>
  intensity?: number
  shape?: Partial<CycloneShape>
  orbit?: number
  showOcean?: boolean
  /** Scales the tier's particle budget — use below 1 for small insets. */
  densityScale?: number
  /** Rendering stops entirely while the canvas is off-screen. */
  pauseOffscreen?: boolean
}

export default function StormCanvas({
  className,
  cameraKeys = HERO_KEYS,
  progressRef,
  intensity = 0.85,
  shape,
  orbit = 0.014,
  showOcean = true,
  densityScale = 1,
  pauseOffscreen = true,
}: StormCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [tier] = useState<Tier>(detectTier)

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
    [],
  )

  // Stop the render loop whenever the canvas leaves the viewport. On a long
  // scrolling page this is the difference between one live canvas and one
  // that keeps burning GPU behind three screens of content.
  useEffect(() => {
    if (!pauseOffscreen) return
    const el = hostRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [pauseOffscreen])

  // Also release the loop when the tab is hidden.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setVisible(false)
      else if (hostRef.current) {
        const r = hostRef.current.getBoundingClientRect()
        setVisible(r.bottom > -120 && r.top < window.innerHeight + 120)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const { density, dpr } = TIER[tier]
  const frameloop = reducedMotion ? 'demand' : visible ? 'always' : 'never'

  return (
    <div ref={hostRef} className={`storm-canvas ${className ?? ''}`}>
      <Canvas
        dpr={dpr}
        frameloop={frameloop}
        camera={{ position: cameraKeys[0].pos, fov: cameraKeys[0].fov, near: 0.1, far: 120 }}
        gl={{
          // The subject is thousands of soft sprites — MSAA buys nothing here
          // and costs a great deal of bandwidth.
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          // Transparent clear so the CSS gradient behind the canvas shows through.
          gl.setClearColor(new THREE.Color('#02060f'), 0)
          // The cloud shader writes final colour itself and converts to the
          // output colour space explicitly, so renderer tone mapping would
          // silently shift every value it authored.
          gl.toneMapping = THREE.NoToneMapping
        }}
        fallback={<div className="storm-canvas__fallback" />}
      >
        <CycloneSystem
          density={density * densityScale}
          intensity={intensity}
          shape={shape}
          cameraKeys={cameraKeys}
          progressRef={progressRef}
          orbit={reducedMotion ? 0 : orbit}
          timeScale={reducedMotion ? 0 : 1}
          showOcean={showOcean}
        />
      </Canvas>
    </div>
  )
}
