import { useEffect, useRef } from 'react'

interface CycloneCanvasProps {
  className?: string
}

/**
 * 2D canvas cyclone renderer.
 * Uses layered volumetric arcs and radial gradients to create a convincing
 * atmospheric spiral — concentric spiral BANDS that rotate, not rings.
 * Performance: capped at 30fps, pauses when off-screen via IntersectionObserver.
 */
export default function CycloneCanvas({ className }: CycloneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)
  const angleRef = useRef<number>(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const visibleRef = useRef<boolean>(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const TARGET_FPS = 30
    const FRAME_INTERVAL = 1000 / TARGET_FPS

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5)
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
        ctx.scale(dpr, dpr)
      }
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    observerRef.current = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting },
      { threshold: 0.05 }
    )
    observerRef.current.observe(canvas)

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /** Draw a single spiral cloud band using many short line segments */
    const drawSpiralBand = (
      cX: number, cY: number,
      rStart: number, rEnd: number,
      angleStart: number,     // start of sweep (pre-rotation)
      sweepRad: number,       // total arc length in radians
      globalAngle: number,    // current rotation
      baseAlpha: number,
      color1: string,         // inner edge color
      color2: string,         // outer edge color
      lineW: number,
    ) => {
      const STEPS = 120
      ctx.save()
      ctx.globalAlpha = baseAlpha
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = lineW

      for (let i = 0; i < STEPS; i++) {
        const t0 = i / STEPS
        const t1 = (i + 1) / STEPS
        const a0 = angleStart + t0 * sweepRad + globalAngle
        const a1 = angleStart + t1 * sweepRad + globalAngle

        // Radius grows as we go around — this is what makes it a SPIRAL
        const r0 = rStart + (rEnd - rStart) * t0
        const r1 = rStart + (rEnd - rStart) * t1

        // Color interpolates from inner to outer
        const tMid = (t0 + t1) / 2
        const grad = ctx.createLinearGradient(
          cX + Math.cos(a0) * r0, cY + Math.sin(a0) * r0,
          cX + Math.cos(a1) * r1, cY + Math.sin(a1) * r1,
        )
        grad.addColorStop(0, color1)
        grad.addColorStop(1, color2)
        ctx.strokeStyle = grad
        // Fade in at start, fade out at end
        ctx.globalAlpha = baseAlpha * Math.sin(tMid * Math.PI) * 0.9 + 0.1

        ctx.beginPath()
        ctx.moveTo(cX + Math.cos(a0) * r0, cY + Math.sin(a0) * r0)
        ctx.lineTo(cX + Math.cos(a1) * r1, cY + Math.sin(a1) * r1)
        ctx.stroke()
      }
      ctx.restore()
    }

    /** Fuzzy radial fill — creates soft volumetric cloud mass */
    const drawCloudMass = (
      cX: number, cY: number,
      r0: number, r1: number,
      alpha: number,
      color: string,
    ) => {
      const grad = ctx.createRadialGradient(cX, cY, r0, cX, cY, r1)
      grad.addColorStop(0, color)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cX, cY, r1, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // ─── Main draw ───────────────────────────────────────────────────────────
    const draw = (rot: number) => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      const cX = w / 2
      const cY = h / 2
      const maxR = Math.min(w, h) * 0.44

      // ── Layer 1: outer ambient atmospheric glow ──
      drawCloudMass(cX, cY, maxR * 0.3, maxR * 1.1, 0.055, 'rgba(160,195,220,1)')

      // ── Layer 2: outer cloud band mass (diffuse) ──
      drawCloudMass(cX, cY, maxR * 0.5, maxR * 1.0, 0.08, 'rgba(190,210,230,1)')
      drawCloudMass(cX, cY, maxR * 0.35, maxR * 0.85, 0.07, 'rgba(200,218,235,1)')

      // ── Layer 3: outer spiral BANDS — 3 arms, staggered ──
      // Each arm sweeps ~1.5π (270°) and the radius grows from 0.55 to 1.0 maxR
      for (let arm = 0; arm < 3; arm++) {
        const armAngle = (arm / 3) * Math.PI * 2
        drawSpiralBand(
          cX, cY,
          maxR * 0.55, maxR * 0.98,
          armAngle, Math.PI * 1.6,
          rot,
          0.22,
          'rgba(200, 215, 232, 0.7)',
          'rgba(160, 190, 215, 0)',
          maxR * 0.12,
        )
      }

      // ── Layer 4: mid cloud band mass ──
      drawCloudMass(cX, cY, maxR * 0.2, maxR * 0.62, 0.12, 'rgba(210,225,240,1)')

      // ── Layer 5: mid spiral BANDS — 3 arms, offset ──
      for (let arm = 0; arm < 3; arm++) {
        const armAngle = (arm / 3) * Math.PI * 2 + Math.PI / 3
        drawSpiralBand(
          cX, cY,
          maxR * 0.28, maxR * 0.60,
          armAngle, Math.PI * 1.75,
          rot,
          0.28,
          'rgba(220, 232, 245, 0.8)',
          'rgba(180, 205, 228, 0)',
          maxR * 0.10,
        )
      }

      // ── Layer 6: inner cloud mass ──
      drawCloudMass(cX, cY, maxR * 0.06, maxR * 0.32, 0.20, 'rgba(228, 238, 250,1)')

      // ── Layer 7: inner spiral BANDS — tight, 4 arms ──
      for (let arm = 0; arm < 4; arm++) {
        const armAngle = (arm / 4) * Math.PI * 2
        drawSpiralBand(
          cX, cY,
          maxR * 0.14, maxR * 0.30,
          armAngle, Math.PI * 1.5,
          rot,
          0.32,
          'rgba(235, 243, 255, 0.9)',
          'rgba(200, 220, 240, 0)',
          maxR * 0.07,
        )
      }

      // ── Layer 8: eye wall — bright ring ──
      const eyeWallR = maxR * 0.115
      const eyeWallGrad = ctx.createRadialGradient(cX, cY, eyeWallR * 0.55, cX, cY, eyeWallR * 1.55)
      eyeWallGrad.addColorStop(0, 'rgba(242, 248, 255, 0)')
      eyeWallGrad.addColorStop(0.35, 'rgba(240, 246, 255, 0.78)')
      eyeWallGrad.addColorStop(0.65, 'rgba(235, 243, 255, 0.88)')
      eyeWallGrad.addColorStop(1, 'rgba(215, 230, 248, 0)')
      ctx.save()
      ctx.globalAlpha = 0.85
      ctx.fillStyle = eyeWallGrad
      ctx.beginPath()
      ctx.arc(cX, cY, eyeWallR * 1.55, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // ── Layer 9: eye — calm dark centre ──
      const eyeR = maxR * 0.07
      const eyeGrad = ctx.createRadialGradient(cX, cY, 0, cX, cY, eyeR * 1.6)
      eyeGrad.addColorStop(0, 'rgba(6, 7, 11, 0.98)')
      eyeGrad.addColorStop(0.55, 'rgba(8, 9, 14, 0.88)')
      eyeGrad.addColorStop(1, 'rgba(10, 12, 18, 0)')
      ctx.save()
      ctx.globalAlpha = 1
      ctx.fillStyle = eyeGrad
      ctx.beginPath()
      ctx.arc(cX, cY, eyeR * 1.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // ── Outer radial fade to background ──
      const outerFade = ctx.createRadialGradient(cX, cY, maxR * 0.65, cX, cY, maxR * 1.05)
      outerFade.addColorStop(0, 'rgba(8, 9, 13, 0)')
      outerFade.addColorStop(1, 'rgba(8, 9, 13, 0.96)')
      ctx.fillStyle = outerFade
      ctx.beginPath()
      ctx.arc(cX, cY, maxR * 1.05, 0, Math.PI * 2)
      ctx.fill()
    }

    // ─── Animation loop ───────────────────────────────────────────────────────
    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (!visibleRef.current) return
      const elapsed = ts - lastFrameRef.current
      if (elapsed < FRAME_INTERVAL) return
      lastFrameRef.current = ts - (elapsed % FRAME_INTERVAL)
      // Northern hemisphere cyclone — counter-clockwise
      angleRef.current -= 0.003
      draw(angleRef.current)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      resizeObserver.disconnect()
      observerRef.current?.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
