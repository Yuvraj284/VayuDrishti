/* ───────────────────────────────────────────────────────────────
   CYCLONE SHADERS
   All motion happens on the GPU. The CPU uploads the particle field
   once at build time and then only advances a single `uTime` uniform
   per frame — no attribute writes, no per-particle JS work.
   ─────────────────────────────────────────────────────────────── */

/**
 * Billboarded instanced quads rather than gl_PointSize sprites: point size is
 * hardware-clamped (often at 64px), which breaks apart the moment the camera
 * dollies into the eye. Quads scale correctly all the way in.
 */
export const cloudVertex = /* glsl */ `
  precision highp float;

  attribute vec3 iPos;      // resting position: xz = plan position, y = altitude
  attribute vec4 iParams;   // x: world size, y: seed, z: brightness, w: alpha

  uniform float uTime;
  uniform float uSpin;      // base angular velocity (rad/s)
  uniform float uShear;     // how much faster the core turns than the rim
  uniform float uEyeR;
  uniform float uMaxR;
  uniform float uOpacity;
  uniform float uTurb;      // turbulence amplitude
  uniform vec3  uColorIn;   // colour at the eyewall
  uniform vec3  uColorOut;  // colour at the outer rainbands
  uniform float uLift;      // vertical scale of the whole system

  varying vec2  vUv;
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    float r  = length(iPos.xz);
    float a0 = atan(iPos.z, iPos.x);
    float seed = iParams.y;

    // ── Differential rotation ──────────────────────────────────────────────
    // Inner bands lead the outer ones, which is what winds a real storm's
    // spiral tighter over time. Kept mild so the banding survives a long view.
    float w = uSpin * (1.0 - uShear + uShear / (1.0 + 0.22 * r));
    float a = a0 + uTime * w;

    // ── Turbulence ─────────────────────────────────────────────────────────
    // Slow radial breathing plus vertical churn, decorrelated per puff.
    float breathe = sin(uTime * 0.55 + seed * 24.0);
    float churn   = sin(uTime * 0.41 + seed * 41.0);
    float rr = r * (1.0 + uTurb * 0.055 * breathe);
    float yy = iPos.y * uLift + uTurb * 0.05 * churn;

    vec3 p = vec3(cos(a) * rr, yy, sin(a) * rr);

    // ── Shading ────────────────────────────────────────────────────────────
    // Two terms give the mass its volume: altitude (cloud tops catch light,
    // the deck below sits in its own shadow) and a soft key from upper-left.
    float lit = 0.30 + 0.70 * smoothstep(-0.40 * uLift, 0.85 * uLift, yy);

    vec3 L = normalize(vec3(-0.52, 0.74, 0.42));
    vec3 N = normalize(vec3(p.x * 0.16, 1.0, p.z * 0.16));
    lit *= 0.72 + 0.28 * max(dot(N, L), 0.0);

    // Colour ramps from pale, sunlit eyewall out to deep teal rainbands.
    float rn = clamp((rr - uEyeR) / max(uMaxR - uEyeR, 0.001), 0.0, 1.0);
    // Guard the base: some drivers return NaN from pow(0.0, x).
    vColor = mix(uColorIn, uColorOut, pow(max(rn, 1e-4), 0.70)) * lit * iParams.z;

    // Fade at both edges so nothing terminates on a hard circle.
    float inner = smoothstep(0.0, 0.085, rn);
    float outer = 1.0 - smoothstep(0.78, 1.0, rn);
    vAlpha = uOpacity * iParams.w * inner * outer;

    // ── Billboard ──────────────────────────────────────────────────────────
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float rot = seed * 6.28318;
    float cr = cos(rot);
    float sr = sin(rot);
    vec2 q = position.xy * iParams.x;
    mv.xy += vec2(q.x * cr - q.y * sr, q.x * sr + q.y * cr);

    vUv = uv;
    gl_Position = projectionMatrix * mv;
  }
`

export const cloudFragment = /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;

  varying vec2  vUv;
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float a = tex.a * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor * tex.rgb, a);

    #include <colorspace_fragment>
  }
`

/**
 * The sea below the storm. One quad — a radial wash that brightens under the
 * eye where the surface is churned, and dissolves into the background at the
 * rim so the disc never reads as a hard-edged plate.
 */
export const oceanVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const oceanFragment = /* glsl */ `
  precision mediump float;

  uniform float uTime;
  uniform vec3  uDeep;
  uniform vec3  uShallow;
  uniform float uOpacity;

  varying vec2 vUv;

  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0;

    // Wind-driven surface texture: concentric swell, slowly rotating.
    float ang = atan(c.y, c.x);
    float swell = sin(d * 26.0 - uTime * 0.55 + ang * 2.0) * 0.5 + 0.5;
    swell *= smoothstep(1.0, 0.18, d) * 0.055;

    // Brighter directly beneath the eye, falling away outward.
    float core = 1.0 - smoothstep(0.0, 0.42, d);
    vec3 col = mix(uDeep, uShallow, core * 0.85 + swell);

    float alpha = uOpacity * (1.0 - smoothstep(0.55, 1.0, d));
    gl_FragColor = vec4(col, alpha);

    #include <colorspace_fragment>
  }
`
