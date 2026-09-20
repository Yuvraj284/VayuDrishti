import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  buildCirrus,
  buildDeck,
  buildEyewall,
  buildScud,
  DEFAULT_SHAPE,
  type CycloneShape,
  type Field,
} from './cycloneField'
import { cloudFragment, cloudVertex, oceanFragment, oceanVertex } from './cycloneShaders'
import { getPuffTexture } from './puffTexture'
import type { CameraKey } from './cameraPresets'

export type { CameraKey }

/* ═══════════════════════════════════════════════════════════════
   CLOUD LAYER
   One instanced draw call for the whole layer. The only per-frame
   work on the CPU is advancing a float.
   ═══════════════════════════════════════════════════════════════ */

interface LayerProps {
  field: Field
  colorIn: string
  colorOut: string
  spin: number
  shear: number
  opacity: number
  turbulence: number
  eyeR: number
  maxR: number
  lift: number
  timeScale: number
  renderOrder: number
}

function CloudLayer({
  field,
  colorIn,
  colorOut,
  spin,
  shear,
  opacity,
  turbulence,
  eyeR,
  maxR,
  lift,
  timeScale,
  renderOrder,
}: LayerProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry()

    // The base quad is built by hand rather than taken from a PlaneGeometry:
    // borrowing another geometry's attributes and then disposing it would tell
    // the renderer to drop the very buffers this geometry still points at.
    geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1))
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(
        // prettier-ignore
        new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]),
        3,
      ),
    )
    geo.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2),
    )

    geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(field.positions, 3))
    geo.setAttribute('iParams', new THREE.InstancedBufferAttribute(field.params, 4))
    geo.instanceCount = field.count

    // Billboards are expanded in the vertex shader, so three cannot derive a
    // useful bound — supply a generous one and skip culling on the mesh.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), maxR * 2)
    return geo
  }, [field, maxR])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: cloudVertex,
      fragmentShader: cloudFragment,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uMap: { value: getPuffTexture() },
        uTime: { value: 0 },
        uSpin: { value: spin },
        uShear: { value: shear },
        uEyeR: { value: eyeR },
        uMaxR: { value: maxR },
        uOpacity: { value: opacity },
        uTurb: { value: turbulence },
        uLift: { value: lift },
        uColorIn: { value: new THREE.Color(colorIn) },
        uColorOut: { value: new THREE.Color(colorOut) },
      },
    })
    // Uniform values are updated in place below; the material itself is built
    // once per layer so shader compilation never repeats.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep uniforms in sync when props change (storm selection, intensity).
  useEffect(() => {
    const u = material.uniforms
    u.uSpin.value = spin
    u.uShear.value = shear
    u.uEyeR.value = eyeR
    u.uMaxR.value = maxR
    u.uOpacity.value = opacity
    u.uTurb.value = turbulence
    u.uLift.value = lift
    ;(u.uColorIn.value as THREE.Color).set(colorIn)
    ;(u.uColorOut.value as THREE.Color).set(colorOut)
  }, [material, spin, shear, eyeR, maxR, opacity, turbulence, lift, colorIn, colorOut])

  // Disposed independently: the geometry is rebuilt whenever the field changes
  // (a new storm selection), while the material must outlive those rebuilds so
  // the shader is never recompiled.
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    // Clamp so a paused tab or an off-screen pause never lurches the storm.
    material.uniforms.uTime.value += Math.min(delta, 0.05) * timeScale
  })

  return (
    <mesh
      geometry={geometry}
      frustumCulled={false}
      renderOrder={renderOrder}
      castShadow={false}
      receiveShadow={false}
    >
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SEA SURFACE
   ═══════════════════════════════════════════════════════════════ */

function Ocean({ radius, timeScale }: { radius: number; timeScale: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: oceanVertex,
        fragmentShader: oceanFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new THREE.Color('#03080f') },
          uShallow: { value: new THREE.Color('#0d2c44') },
          uOpacity: { value: 0.9 },
        },
      }),
    [],
  )

  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    material.uniforms.uTime.value += Math.min(delta, 0.05) * timeScale
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.58, 0]} renderOrder={-1}>
      <circleGeometry args={[radius, 72]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CAMERA RIG
   Scroll drives a keyframed dolly from a wide establishing shot
   down into the eye. Damped, so scroll jitter never shows.
   ═══════════════════════════════════════════════════════════════ */

interface RigProps {
  keys: CameraKey[]
  progressRef?: React.RefObject<number>
  /** Constant azimuthal drift, rad/s. */
  orbit?: number
  damping?: number
}

const _look = new THREE.Vector3()
const _pos = new THREE.Vector3()

function CameraRig({ keys, progressRef, orbit = 0.014, damping = 2.4 }: RigProps) {
  const { camera, invalidate, size } = useThree()
  const started = useRef(false)
  // Own accumulator rather than clock.elapsedTime: the render loop stops while
  // the canvas is off-screen, and wall-clock time would jump the orbit on resume.
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    const cam = camera as THREE.PerspectiveCamera
    const dt = Math.min(delta, 0.05)
    elapsed.current += dt
    const p = Math.max(0, Math.min(1, progressRef?.current ?? 0))

    // Locate the segment containing p and interpolate its endpoints.
    let a = keys[0]
    let b = keys[keys.length - 1]
    for (let i = 0; i < keys.length - 1; i++) {
      if (p >= keys[i].p && p <= keys[i + 1].p) {
        a = keys[i]
        b = keys[i + 1]
        break
      }
    }
    const span = b.p - a.p
    const raw = span <= 0 ? 0 : (p - a.p) / span
    // Ease within the segment so pose changes start and end softly.
    const t = raw * raw * (3 - 2 * raw)

    _pos.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * t,
      a.pos[1] + (b.pos[1] - a.pos[1]) * t,
      a.pos[2] + (b.pos[2] - a.pos[2]) * t,
    )
    _look.set(
      a.look[0] + (b.look[0] - a.look[0]) * t,
      a.look[1] + (b.look[1] - a.look[1]) * t,
      a.look[2] + (b.look[2] - a.look[2]) * t,
    )
    const fov = a.fov + (b.fov - a.fov) * t

    // Fit for aspect. The camera's field of view is vertical, so a portrait
    // viewport crops the storm horizontally — it is a wide, flat object. Back
    // the camera off to compensate, easing the correction out as we descend
    // into the eye, where the subject surrounds the camera anyway.
    const aspect = size.width / Math.max(size.height, 1)
    const fitFactor = Math.min(2.6, Math.max(1, 1.25 / aspect))
    if (fitFactor > 1) _pos.multiplyScalar(1 + (fitFactor - 1) * (1 - p))

    // Slow orbital drift keeps the shot alive when the page is still.
    if (orbit !== 0) {
      const az = elapsed.current * orbit
      const cx = Math.cos(az)
      const sx = Math.sin(az)
      const x = _pos.x * cx - _pos.z * sx
      const z = _pos.x * sx + _pos.z * cx
      _pos.set(x, _pos.y, z)
    }

    if (!started.current) {
      // Snap on the first frame — no fly-in from the origin.
      cam.position.copy(_pos)
      cam.fov = fov
      started.current = true
    } else {
      const k = 1 - Math.exp(-damping * dt)
      cam.position.lerp(_pos, k)
      cam.fov += (fov - cam.fov) * k
    }

    cam.updateProjectionMatrix()
    cam.lookAt(_look)
  })

  // Render one frame on mount even in demand mode (reduced motion).
  useEffect(() => invalidate(), [invalidate])

  return null
}

/* ═══════════════════════════════════════════════════════════════
   THE STORM
   ═══════════════════════════════════════════════════════════════ */

export interface StormProps {
  /** Particle budget multiplier — dialled down on low-power devices. */
  density?: number
  /** 0–1 storm strength. Drives eye size, banding contrast, spin rate. */
  intensity?: number
  shape?: Partial<CycloneShape>
  cameraKeys: CameraKey[]
  progressRef?: React.RefObject<number>
  orbit?: number
  /** Global motion rate; 0 freezes the storm for reduced-motion users. */
  timeScale?: number
  showOcean?: boolean
}

export default function CycloneSystem({
  density = 1,
  intensity = 0.85,
  shape: shapeOverride,
  cameraKeys,
  progressRef,
  orbit = 0.014,
  timeScale = 1,
  showOcean = true,
}: StormProps) {
  const shape: CycloneShape = useMemo(
    () => ({
      ...DEFAULT_SHAPE,
      // A stronger storm carries a tighter, better-defined eye.
      eyeR: 1.35 - 0.5 * intensity,
      organisation: 0.35 + 0.62 * intensity,
      tightness: 0.52 - 0.10 * intensity,
      ...shapeOverride,
    }),
    [intensity, shapeOverride],
  )

  const counts = useMemo(
    () => ({
      deck: Math.round(10500 * density),
      wall: Math.round(4200 * density),
      cirrus: Math.round(2400 * density),
      scud: Math.round(700 * density),
    }),
    [density],
  )

  const deck = useMemo(() => buildDeck(counts.deck, shape), [counts.deck, shape])
  const wall = useMemo(() => buildEyewall(counts.wall, shape), [counts.wall, shape])
  const cirrus = useMemo(() => buildCirrus(counts.cirrus, shape), [counts.cirrus, shape])
  const scud = useMemo(() => buildScud(counts.scud, shape), [counts.scud, shape])

  // Stronger systems spin faster and hold their structure more rigidly.
  const spin = 0.13 + 0.14 * intensity

  return (
    <>
      <CameraRig keys={cameraKeys} progressRef={progressRef} orbit={orbit} />

      {showOcean && <Ocean radius={shape.maxR * 2.1} timeScale={timeScale} />}

      {/* Sea-level scud — sits under everything, gives the eye a floor. */}
      <CloudLayer
        field={scud}
        colorIn="#7fa8c0"
        colorOut="#16344c"
        spin={spin * 0.72}
        shear={0.26}
        opacity={0.85}
        turbulence={1.4}
        eyeR={0}
        maxR={shape.maxR}
        lift={1}
        timeScale={timeScale}
        renderOrder={0}
      />

      {/* Main deck and rainbands. */}
      <CloudLayer
        field={deck}
        colorIn="#c3dcea"
        colorOut="#15405e"
        spin={spin}
        shear={0.20}
        opacity={1}
        turbulence={1}
        eyeR={shape.eyeR}
        maxR={shape.maxR}
        lift={1}
        timeScale={timeScale}
        renderOrder={1}
      />

      {/* Eyewall — brightest, tightest, fastest. */}
      <CloudLayer
        field={wall}
        colorIn="#e4f2f9"
        colorOut="#4e9cba"
        spin={spin * 1.22}
        shear={0.10}
        opacity={0.95 * (0.55 + 0.45 * intensity)}
        turbulence={0.7}
        eyeR={shape.eyeR * 0.6}
        maxR={shape.eyeR * 3.4}
        lift={1}
        timeScale={timeScale}
        renderOrder={2}
      />

      {/* Cirrus outflow — thin, wide, counter-rotating. */}
      <CloudLayer
        field={cirrus}
        colorIn="#a8cfe2"
        colorOut="#122f48"
        spin={-spin * 0.34}
        shear={0.06}
        opacity={0.9}
        turbulence={1.8}
        eyeR={shape.eyeR}
        maxR={shape.maxR * 1.32}
        lift={1}
        timeScale={timeScale}
        renderOrder={3}
      />
    </>
  )
}
