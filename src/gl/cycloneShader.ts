/* ───────────────────────────────────────────────────────────────
   PROCEDURAL CYCLONE SHADER

   Adapted from the CycloneCast renderer. The storm is not geometry:
   a single full-screen triangle ray-casts an analytic sphere, and the
   cyclone is a procedural density field evaluated on its surface —
   log-spiral rainbands, a Gaussian eyewall ring, a cleared eye, fbm
   cloud texture, and self-shadowing taken from the density gradient
   toward the light.

   VayuDrishti changes from the original:
     · colour is fully uniform-driven, so the palette comes from the
       storm parameter system rather than being baked in
     · octave count is a compile-time define, so weak devices get a
       cheaper shader instead of only a lower resolution
     · terminator, halo and rim strength are exposed as uniforms to
       hold the dark-navy key of the rest of the product
   ─────────────────────────────────────────────────────────────── */

export const VERT = /* glsl */ `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`

/**
 * @param octaves fbm octaves for the main cloud texture (3–6).
 *                GLSL ES 1.00 needs a constant loop bound, so this is
 *                compiled in rather than passed as a uniform.
 */
export function buildFragment(octaves: number): string {
  const oct = Math.max(2, Math.min(6, Math.round(octaves)))
  return /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

#define FBM_OCT ${oct}

uniform vec2  uRes;
uniform vec2  uCenter;     // sphere centre, device px
uniform float uR;          // sphere radius, device px
uniform float uTime;

uniform vec2  uC;          // storm centre on the sphere, as a view-space offset
uniform vec3  uOcean;
uniform vec3  uCloud;
uniform vec3  uGlow;

uniform float uArms;       // number of principal rainband arms
uniform float uTight;      // log-spiral tightness
uniform float uEye;        // eye radius, fraction of sphere radius
uniform float uSpin;       // rad/s
uniform float uCover;      // background cloud cover
uniform float uPower;      // rainband contrast — organisation
uniform float uDir;        // +1 northern hemisphere, -1 southern

uniform float uNight;      // 0 = evenly lit, 1 = hard terminator
uniform float uHalo;       // atmospheric limb glow
uniform float uFlash;      // lightning in the deep convection

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < FBM_OCT; i++){
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

float fbm3(vec2 p){
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++){
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

/**
 * Cloud density at storm-plane position q, in units of sphere radius.
 * stormMask fades the system out around the limb; tx returns the cloud
 * texture value so the surface shader can modulate brightness with it.
 */
float density(vec2 q, float stormMask, out float tx){
  q.y *= uDir;
  float rr = length(q);
  float ang = atan(q.y, q.x);

  // Log spiral: winding the angular coordinate by ln(r) is what turns
  // concentric banding into a spiral.
  float a = ang + uTight * log(rr + 0.06) - uTime * uSpin;
  vec2 pr = rr * vec2(cos(a), sin(a));

  float f = fbm(pr * 5.0 + 3.7);
  float g = fbm(pr * 13.0 - 1.9);
  float h = noise(pr * 40.0);
  float fine = noise(pr * (uR / 26.0)) * 0.6 + noise(pr * (uR / 11.0)) * 0.4;
  float tex = 0.50 * f + 0.27 * g + 0.13 * h + 0.10 * fine;
  tx = tex;

  // Ambient overcast away from the system.
  float base = smoothstep(0.50 - uCover * 0.18, 0.86, f) * 0.6;

  // Spiral rainbands, suppressed inside the eyewall and beyond the rim.
  float band = pow(max(0.5 + 0.5 * cos(uArms * a), 0.0), 1.6);
  float bm = smoothstep(uEye * 1.6, uEye * 3.2, rr) * (1.0 - smoothstep(0.5, 1.25, rr));
  float bands = band * bm * (0.05 + 1.25 * tex) * uPower * (0.78 + 0.44 * fine);

  // Eyewall: a Gaussian ring just outside the eye.
  float ringR = uEye * 1.5;
  float wz = (rr - ringR) / (uEye * 0.8);
  float wall = exp(-wz * wz) * (0.7 + 0.6 * g);

  // Central dense overcast.
  float core = (1.0 - smoothstep(0.0, 0.42, rr)) * (0.25 + 0.5 * f);

  float d = base + stormMask * (bands + wall * 1.1 + core);
  float th = 1.0 - exp(-0.9 * max(d, 0.0));

  // Clear the eye, with a ragged edge.
  float eyeEdge = uEye * (0.85 + 0.2 * g);
  th = mix(0.10 * g * g, th, smoothstep(eyeEdge * 0.7, eyeEdge * 1.15, rr));
  return th;
}

void main(){
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (fc - uCenter) / uR;
  p.y = -p.y;
  float rd = length(p);
  float px = 1.0 / uR;

  if (rd > 1.4){ gl_FragColor = vec4(0.0); return; }

  vec3 L = normalize(vec3(-0.55, 0.55, 0.62));

  // Atmospheric limb halo, premultiplied.
  vec2 dir = p / max(rd, 0.0001);
  float dl = clamp(dot(dir, L.xy) * 0.5 + 0.62, 0.0, 1.0);
  float ha = exp(-max(rd - 1.0, 0.0) * 14.0) * uHalo * dl;
  vec4 halo = vec4(uGlow * ha, ha);

  float edge = 1.0 - smoothstep(1.0 - px, 1.0 + px, rd);
  vec4 surf = vec4(0.0);

  if (rd < 1.0 + px * 2.0){
    // Reconstruct the sphere normal analytically — no geometry, no depth.
    float nz = sqrt(max(0.0, 1.0 - rd * rd));
    vec3 n = vec3(p, nz);

    // Basis around the storm centre direction.
    vec3 c  = normalize(vec3(uC, sqrt(max(0.02, 1.0 - dot(uC, uC)))));
    vec3 e1 = normalize(cross(vec3(0.0, 1.0, 0.0), c));
    vec3 e2 = cross(c, e1);
    vec2 q  = vec2(dot(n, e1), dot(n, e2));
    float sm = smoothstep(-0.05, 0.3, dot(n, c));

    float tx, tx1;
    float d0 = density(q, sm, tx);

    // Self-shadowing: sample the field again, stepped toward the light,
    // and read the gradient as thickness. One extra tap buys most of the
    // volume a real march would give.
    vec2 lp = vec2(dot(L, e1), dot(L, e2));
    float d1 = density(q + lp * clamp(px * 5.0, 0.003, 0.02), sm, tx1);
    float shade = clamp(1.0 + (d0 - d1) * 6.0, 0.35, 1.35);

    float a0 = smoothstep(0.08, 0.35, d0);

    float lit = dot(n, L);
    float day = mix(1.0, smoothstep(-0.2, 0.6, lit), uNight);

    // Sea surface.
    float wv = fbm3(q * 18.0 + uTime * 0.02);
    vec3 ocean = uOcean * (0.75 + 0.5 * wv);
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 60.0) * 0.5;
    vec3 oc = ocean * (0.06 + day * 1.05) + vec3(0.62, 0.80, 0.95) * spec * day * (1.0 - a0);

    // Cloud.
    vec3 cl = uCloud * (0.08 + day * 0.92) * shade;
    cl *= (0.64 + 0.62 * tx) * mix(1.0, 0.86, smoothstep(0.45, 0.8, d0));

    vec3 col = mix(oc, cl, a0);

    // Lightning in deep convection, only where the surface is unlit.
    float cell = hash12(floor(q * 45.0) + floor(uTime * 7.0));
    float fl = step(0.9975, cell)
             * (1.0 - smoothstep(0.0, 0.55, length(fract(q * 45.0) - 0.5)))
             * a0 * (1.0 - day) * sm * uFlash;
    col += vec3(0.62, 0.78, 0.95) * fl * 1.4;

    // Limb rim.
    float rim = pow(max(1.0 - nz, 0.0), 2.4);
    col += uGlow * rim * (0.25 + 1.1 * day);

    surf = vec4(clamp(col, 0.0, 1.0), 1.0);
  }

  gl_FragColor = surf * edge + halo * (1.0 - edge);
}
`
}
