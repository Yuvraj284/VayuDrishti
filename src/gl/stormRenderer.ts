import { VERT, buildFragment } from './cycloneShader'
import type { StormVisual } from './stormVisual'

/* ───────────────────────────────────────────────────────────────
   STORM RENDERER

   Plain WebGL, no framework and no three.js. One full-screen
   triangle; the sphere and the cyclone are produced entirely in the
   fragment shader.

   The storm's placement is animated in *screen space*: an eye
   position, a log radius, and an offset of the storm from the
   sphere's facing point. Growing the radius past the viewport is what
   produces the dive into the eye — there is no camera to move.

   Scroll progress is read through a callback every frame rather than
   passed as a prop, so driving the animation never re-renders React.
   ─────────────────────────────────────────────────────────────── */

export interface DiscPose {
  /** Eye position on screen, CSS px. */
  ex: number
  ey: number
  /** Sphere radius, CSS px. */
  R: number
  /** Storm offset from the sphere's facing point, in radii. */
  cx: number
  cy: number
}

/** A pose keyframe, resolved against the current viewport. */
export interface StageKey {
  /** Scroll progress at which this pose is reached, 0–1. */
  p: number
  pose: (w: number, h: number, mobile: boolean) => DiscPose
}

export interface RendererOptions {
  stages: StageKey[]
  getProgress: () => number
  getVisual: () => StormVisual
  /** fbm octaves — lowered on weak devices. */
  octaves?: number
  /** Device pixel ratio ceiling. */
  dprCap?: number
  reduceMotion?: boolean
}

export interface StormRenderer {
  readonly ok: boolean
  resize(): void
  start(onFrame?: () => void): void
  stop(): void
  destroy(): void
  /** Live eye position and sphere radius in CSS px — used to pin callouts. */
  eye(): { x: number; y: number; R: number }
}

const UNIFORMS = [
  'uRes', 'uCenter', 'uR', 'uTime', 'uC', 'uOcean', 'uCloud', 'uGlow',
  'uArms', 'uTight', 'uEye', 'uSpin', 'uCover', 'uPower', 'uDir',
  'uNight', 'uHalo', 'uFlash',
] as const

type UniformName = (typeof UNIFORMS)[number]

const smooth = (t: number) => t * t * (3 - 2 * t)

export function createStormRenderer(
  canvas: HTMLCanvasElement,
  opts: RendererOptions,
): StormRenderer {
  const {
    stages,
    getProgress,
    getVisual,
    octaves = 6,
    dprCap = 1.75,
    reduceMotion = false,
  } = opts

  let gl: WebGLRenderingContext | null = null
  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  const U = {} as Record<UniformName, WebGLUniformLocation | null>

  let dpr = 1
  let vw = 0
  let vh = 0
  let raf = 0
  let running = false
  let t0 = 0
  let last = 0

  // Current (damped) pose. `settled` is false until the first frame places it.
  const disc: DiscPose = { ex: 0, ey: 0, R: 1, cx: 0, cy: 0 }
  let lr = 0 // log radius — interpolating in log space keeps the zoom even
  let settled = false

  /* ── GL setup ───────────────────────────────────────────────────────── */
  try {
    gl = canvas.getContext('webgl', {
      premultipliedAlpha: true,
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    }) as WebGLRenderingContext | null

    if (gl) {
      const compile = (type: number, src: string) => {
        const sh = gl!.createShader(type)!
        gl!.shaderSource(sh, src)
        gl!.compileShader(sh)
        if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
          throw new Error(gl!.getShaderInfoLog(sh) ?? 'shader compile failed')
        }
        return sh
      }

      const vs = compile(gl.VERTEX_SHADER, VERT)
      const fs = compile(gl.FRAGMENT_SHADER, buildFragment(octaves))
      program = gl.createProgram()!
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? 'link failed')
      }
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.useProgram(program)

      // One oversized triangle covers the viewport with no seam.
      buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(program, 'aPos')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

      for (const n of UNIFORMS) U[n] = gl.getUniformLocation(program, n)
    }
  } catch (err) {
    // A missing or broken context is not fatal — the host renders its poster.
    console.warn('[VayuDrishti] WebGL unavailable:', err)
    gl = null
  }

  /* ── Pose ───────────────────────────────────────────────────────────── */

  function targetPose(): DiscPose {
    const p = Math.max(0, Math.min(1, getProgress()))
    const mobile = vw < 760

    let a = stages[0]
    let b = stages[stages.length - 1]
    for (let i = 0; i < stages.length - 1; i++) {
      if (p >= stages[i].p && p <= stages[i + 1].p) {
        a = stages[i]
        b = stages[i + 1]
        break
      }
    }

    const span = b.p - a.p
    const t = span <= 0 ? 0 : smooth((p - a.p) / span)

    const pa = a.pose(vw, vh, mobile)
    const pb = b.pose(vw, vh, mobile)
    const mix = (x: number, y: number) => x + (y - x) * t

    return {
      ex: mix(pa.ex, pb.ex),
      ey: mix(pa.ey, pb.ey),
      // Log space, so a 10× zoom reads as evenly paced as a 2× one.
      R: Math.exp(mix(Math.log(pa.R), Math.log(pb.R))),
      cx: mix(pa.cx, pb.cx),
      cy: mix(pa.cy, pb.cy),
    }
  }

  function update(dt: number) {
    const tg = targetPose()
    if (!settled) {
      disc.ex = tg.ex
      disc.ey = tg.ey
      disc.cx = tg.cx
      disc.cy = tg.cy
      lr = Math.log(tg.R)
      settled = true
    } else {
      const k = 1 - Math.exp(-dt * (reduceMotion ? 30 : 3.4))
      disc.ex += (tg.ex - disc.ex) * k
      disc.ey += (tg.ey - disc.ey) * k
      disc.cx += (tg.cx - disc.cx) * k
      disc.cy += (tg.cy - disc.cy) * k
      lr += (Math.log(tg.R) - lr) * k
    }
    disc.R = Math.exp(lr)
  }

  /** Sphere centre from the eye position and the storm's offset on the globe. */
  const sphereCentre = () => ({
    x: disc.ex - disc.R * disc.cx,
    y: disc.ey + disc.R * disc.cy,
  })

  /* ── Draw ───────────────────────────────────────────────────────────── */

  function draw(time: number) {
    if (!gl || !program) return
    const v = getVisual()
    const c = sphereCentre()

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.disable(gl.SCISSOR_TEST)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    // Only shade the disc's bounding box. At the wide establishing shot this
    // is most of the screen, but the inset and the early hero save real time.
    const pad = disc.R * 1.42
    const x0 = Math.max(0, (c.x - pad) * dpr)
    const x1 = Math.min(canvas.width, (c.x + pad) * dpr)
    const y0 = Math.max(0, (c.y - pad) * dpr)
    const y1 = Math.min(canvas.height, (c.y + pad) * dpr)
    if (x1 <= x0 || y1 <= y0) return

    gl.enable(gl.SCISSOR_TEST)
    gl.scissor(
      Math.floor(x0),
      Math.floor(canvas.height - y1),
      Math.ceil(x1 - x0),
      Math.ceil(y1 - y0),
    )

    gl.uniform2f(U.uRes, canvas.width, canvas.height)
    gl.uniform2f(U.uCenter, c.x * dpr, c.y * dpr)
    gl.uniform1f(U.uR, disc.R * dpr)
    gl.uniform1f(U.uTime, time)
    gl.uniform2f(U.uC, disc.cx, disc.cy)
    gl.uniform3fv(U.uOcean, v.ocean)
    gl.uniform3fv(U.uCloud, v.cloud)
    gl.uniform3fv(U.uGlow, v.glow)
    gl.uniform1f(U.uArms, v.arms)
    gl.uniform1f(U.uTight, v.tight)
    gl.uniform1f(U.uEye, v.eye)
    gl.uniform1f(U.uSpin, v.spin * (reduceMotion ? 0 : 1))
    gl.uniform1f(U.uCover, v.cover)
    gl.uniform1f(U.uPower, v.power)
    gl.uniform1f(U.uDir, v.hemi)
    gl.uniform1f(U.uNight, v.night)
    gl.uniform1f(U.uHalo, v.halo)
    gl.uniform1f(U.uFlash, reduceMotion ? 0 : v.flash)

    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /* ── Public surface ─────────────────────────────────────────────────── */

  function resize() {
    const rect = canvas.getBoundingClientRect()
    vw = Math.max(1, Math.round(rect.width))
    vh = Math.max(1, Math.round(rect.height))
    dpr = Math.min(window.devicePixelRatio || 1, vw < 760 ? Math.min(dprCap, 1.5) : dprCap)
    const w = Math.round(vw * dpr)
    const h = Math.round(vh * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    // The pose is viewport-relative, so re-place it immediately on resize.
    if (settled) {
      const tg = targetPose()
      disc.ex = tg.ex
      disc.ey = tg.ey
      lr = Math.log(tg.R)
      disc.R = tg.R
    }
  }

  function start(onFrame?: () => void) {
    if (running || !gl) {
      // Even with no GL, run the callback once so callouts can hide cleanly.
      onFrame?.()
      return
    }
    running = true
    t0 = performance.now()
    last = t0

    const frame = (now: number) => {
      if (!running) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      update(dt)
      draw((now - t0) / 1000)
      onFrame?.()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
  }

  function stop() {
    running = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  function destroy() {
    stop()
    if (!gl) return
    if (buffer) gl.deleteBuffer(buffer)
    if (program) gl.deleteProgram(program)
    // Free the context rather than waiting for GC — browsers cap how many
    // live contexts a document may hold.
    const lose = gl.getExtension('WEBGL_lose_context')
    lose?.loseContext()
    gl = null
    program = null
    buffer = null
  }

  return {
    get ok() {
      return !!gl
    },
    resize,
    start,
    stop,
    destroy,
    eye: () => ({ x: disc.ex, y: disc.ey, R: disc.R }),
  }
}
