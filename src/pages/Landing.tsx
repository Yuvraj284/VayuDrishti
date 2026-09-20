import { useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Nav from '../components/layout/Nav'
import TrackPlot, { ktColor } from '../components/data/TrackPlot'
import Mark from '../brand/Mark'
import StormCanvas from '../gl/StormCanvas'
import { HERO_STAGES } from '../gl/stagePresets'
import { heroVisual } from '../gl/stormVisual'
import { useScrollStage } from '../hooks/useScrollStage'
import { STORMS, intensityLabel, peakKt } from '../data/storms'
import { HEADLINE_METRICS, TEST_METRICS, THRESHOLD } from '../data/model'
import { EASE, inView, reveal, revealX, stagger } from '../motion'
import './Landing.css'

/* ── Storm anatomy, revealed as the camera descends into the eye ── */
const ANATOMY = [
  {
    key: 'outflow',
    label: 'Outflow canopy',
    altitude: '12 – 16 km',
    body:
      'Air that has risen through the core spreads outward as a cirrus shield, fanning anticyclonically against the storm’s own rotation. Its extent is the clearest satellite signature of a healthy system.',
  },
  {
    key: 'bands',
    label: 'Spiral rainbands',
    altitude: '2 – 8 km',
    body:
      'Convective bands wrap inward along a logarithmic spiral, separated by subsiding clear lanes. They feed the core with warm, moist air drawn off the sea surface.',
  },
  {
    key: 'eyewall',
    label: 'Eyewall',
    altitude: '0 – 15 km',
    body:
      'The ring of deepest convection, and where the strongest surface winds are found. Its inner face leans outward with height — the stadium effect visible from inside the eye.',
  },
  {
    key: 'eye',
    label: 'The eye',
    altitude: 'Surface',
    body:
      'Air subsides through the centre, warming and drying as it sinks. Pressure bottoms out here: 940 hPa in Phailin at peak, against 1008 hPa in the surrounding environment.',
  },
]

const STAGE_THRESHOLDS = [0.14, 0.38, 0.6, 0.82]

const INTENSITY_KEY = [34, 48, 64, 83, 96, 113]

export default function Landing() {
  const stageRef = useRef<HTMLDivElement>(null)
  const { progress, stage } = useScrollStage(stageRef, STAGE_THRESHOLDS)

  const phailin = useMemo(() => STORMS.find((s) => s.id === 'BOB-03-2013')!, [])
  const active = stage > 0 ? ANATOMY[stage - 1] : null
  const visual = useMemo(() => heroVisual(phailin), [phailin])

  // Callouts are pinned to the storm's live screen position. They are written
  // straight to the DOM from the render loop — putting the eye position into
  // React state would re-render the page sixty times a second.
  const eyeRef = useRef<HTMLDivElement>(null)
  const wallRef = useRef<HTMLDivElement>(null)
  const bandRef = useRef<HTMLDivElement>(null)

  const handleFrame = useCallback(
    (eye: { x: number; y: number; R: number }) => {
      const place = (el: HTMLDivElement | null, x: number, y: number) => {
        if (!el) return
        const off = x < -80 || y < -80 || x > window.innerWidth + 80 || y > window.innerHeight + 80
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
        el.style.opacity = off ? '0' : ''
      }

      place(eyeRef.current, eye.x, eye.y)

      // Callouts sit to the left of the eye so they never collide with the
      // anatomy card on the right.
      // The eyewall ring sits at 1.5 x the eye radius in the shader.
      const rWall = visual.eye * 1.5 * eye.R
      place(wallRef.current, eye.x + Math.cos(-2.24) * rWall, eye.y + Math.sin(-2.24) * rWall)

      // A representative point out in the rainbands.
      const rBand = 0.13 * eye.R
      place(bandRef.current, eye.x + Math.cos(2.32) * rBand, eye.y + Math.sin(2.32) * rBand)
    },
    [visual.eye],
  )

  return (
    <div className="landing">
      <Nav transparent />

      {/* ═══════════════════════════════════════════════════════
          STAGE — one continuous shot from establishing wide to
          inside the eye. The canvas is sticky; scroll is the dolly.
          ═══════════════════════════════════════════════════════ */}
      <div className="stage" ref={stageRef}>
        <div className="stage__sticky">
          <StormCanvas
            className="stage__canvas"
            stages={HERO_STAGES}
            visual={visual}
            progressRef={progress}
            onFrame={handleFrame}
          />

          <div className="stage__vignette" />
          <div className="stage__floor" />

          {/* ── Scientific callouts, pinned to the storm itself ── */}
          <div className={`callouts ${stage >= 1 ? 'callouts--on' : ''}`} aria-hidden="true">
            <div className="callout callout--eye" ref={eyeRef}>
              <span className="callout__dot" />
              <span className="callout__line" />
              <span className="callout__text">
                Eye
                <span className="callout__sub">940 hPa</span>
              </span>
            </div>
            <div className="callout callout--wall" ref={wallRef}>
              <span className="callout__dot" />
              <span className="callout__line" />
              <span className="callout__text">
                Eyewall
                <span className="callout__sub">115 kt</span>
              </span>
            </div>
            <div className="callout callout--band" ref={bandRef}>
              <span className="callout__dot" />
              <span className="callout__line" />
              <span className="callout__text">
                Rainbands
                <span className="callout__sub">spiral inflow</span>
              </span>
            </div>
          </div>

          {/* ── Hero copy ── */}
          <motion.div
            className={`hero ${stage > 0 ? 'hero--gone' : ''}`}
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div className="hero__eyebrow" variants={reveal} custom={0.3}>
              <Mark size={18} tone="mono" />
              <span>Cyclone intelligence</span>
            </motion.div>

            <motion.h1 className="hero__title" variants={reveal} custom={0.45}>
              VayuDrishti
            </motion.h1>

            <motion.p className="hero__lede" variants={reveal} custom={0.6}>
              Atmospheric vision over the North Indian Ocean — historical cyclone
              systems read through meteorological fields and a convolutional model.
            </motion.p>

            <motion.div className="hero__actions" variants={reveal} custom={0.78}>
              <Link to="/monitor" className="action action--primary" id="cta-explore">
                Explore the archive
                <span className="action__arrow">→</span>
              </Link>
              <Link to="/predict" className="action action--ghost" id="cta-model">
                View the model
              </Link>
            </motion.div>
          </motion.div>

          {/* ── Anatomy annotation ── */}
          <div className="anatomy" aria-live="polite">
            <AnimatePresence mode="wait">
              {active && (
                <motion.div
                  key={active.key}
                  className="anatomy__card"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.55, ease: EASE }}
                >
                  <span className="anatomy__altitude label">{active.altitude}</span>
                  <h2 className="anatomy__label">{active.label}</h2>
                  <p className="anatomy__body">{active.body}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Persistent instrument readout ── */}
          <div className="stage__readout">
            <div className="readout-group">
              <span className="label">System</span>
              <span className="readout-group__value readout">Phailin · BOB 03/2013</span>
            </div>
            <div className="readout-group">
              <span className="label">Peak position</span>
              <span className="readout-group__value readout">14.28°N 87.64°E</span>
            </div>
            <div className="readout-group readout-group--wide">
              <span className="label">Stage</span>
              <div className="stage__ticks">
                {['Wide', ...ANATOMY.map((a) => a.label)].map((name, i) => (
                  <span
                    key={name}
                    className={`stage__tick ${i === stage ? 'stage__tick--on' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className={`stage__scroll ${stage > 0 ? 'stage__scroll--gone' : ''}`}>
            <span className="label">Scroll to descend</span>
            <span className="stage__scroll-line" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          DOSSIER
          ═══════════════════════════════════════════════════════ */}
      <section className="dossier" id="section-dossier">
        <div className="shell dossier__inner">
          <motion.div
            className="dossier__text"
            initial="hidden"
            whileInView="visible"
            viewport={inView}
            variants={stagger}
          >
            <motion.div className="eyebrow" variants={reveal} custom={0}>
              {phailin.basin} · {phailin.year}
            </motion.div>

            <motion.h2 className="dossier__name display" variants={reveal} custom={0.08}>
              {phailin.name}
            </motion.h2>

            <motion.div className="dossier__vitals" variants={reveal} custom={0.18}>
              <div className="vital">
                <span className="vital__value readout">{phailin.vmax}</span>
                <span className="vital__label label">peak intensity</span>
              </div>
              <div className="vital">
                <span className="vital__value readout">{phailin.mslp}</span>
                <span className="vital__label label">minimum pressure</span>
              </div>
              <div className="vital">
                <span className="vital__value readout">{phailin.cat}</span>
                <span className="vital__label label">{intensityLabel(phailin.cat).toLowerCase()}</span>
              </div>
            </motion.div>

            <motion.p className="dossier__body prose" variants={reveal} custom={0.28}>
              {phailin.summary} VayuDrishti&apos;s classifier returns a cyclone
              probability of <span className="dossier__prob readout">{phailin.prob.toFixed(3)}</span> on
              this system — well above the {THRESHOLD} decision threshold.
            </motion.p>

            <motion.div variants={reveal} custom={0.38}>
              <Link to="/monitor" className="dossier__link" id="cta-track">
                Follow the track
                <span className="action__arrow">→</span>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="dossier__chart"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={inView}
            transition={{ duration: 1, ease: EASE }}
          >
            <IntensityProfile storm={phailin} />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          BASIN — real geography, real tracks
          ═══════════════════════════════════════════════════════ */}
      <section className="basin" id="section-basin">
        <div className="shell">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={inView}
            variants={stagger}
          >
            <motion.div className="eyebrow" variants={reveal} custom={0}>
              Archive · 2012 – 2017
            </motion.div>
            <motion.h2 className="section__title heading" variants={reveal} custom={0.08}>
              Five systems, two basins
            </motion.h2>
            <motion.p className="section__lede prose" variants={reveal} custom={0.16}>
              Best-track positions at six-hourly intervals across the Arabian Sea and
              the Bay of Bengal, coloured by sustained wind speed.
            </motion.p>

            <motion.div variants={reveal} custom={0.24}>
              <TrackPlot storms={STORMS} />
              <div className="track-key">
                {INTENSITY_KEY.map((kt, i) => (
                  <span className="track-key__item" key={kt}>
                    <span className="track-key__swatch" style={{ background: ktColor(kt + 1) }} />
                    {i === INTENSITY_KEY.length - 1 ? `${kt}+ kt` : `${kt}–${INTENSITY_KEY[i + 1]} kt`}
                  </span>
                ))}
                <Link to="/monitor" className="track-key__link">
                  Open the interactive map <span className="action__arrow">→</span>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          MODEL
          ═══════════════════════════════════════════════════════ */}
      <section className="model" id="section-model">
        <div className="shell model__inner">
          <motion.div
            className="model__text"
            initial="hidden"
            whileInView="visible"
            viewport={inView}
            variants={stagger}
          >
            <motion.div className="eyebrow" variants={reveal} custom={0}>
              VayuDrishti CNN v1
            </motion.div>
            <motion.h2 className="section__title heading" variants={reveal} custom={0.08}>
              Binary cyclone classification
            </motion.h2>
            <motion.p className="section__lede prose" variants={reveal} custom={0.16}>
              A convolutional network over ten-channel meteorological grids — wind,
              pressure, humidity, temperature and vorticity — separating cyclonic
              from non-cyclonic atmospheric states. Evaluated on{' '}
              {TEST_METRICS.samples.toLocaleString()} held-out samples spanning 2012–2017.
            </motion.p>
            <motion.div variants={reveal} custom={0.26}>
              <Link to="/predict" className="dossier__link">
                Inspect the architecture
                <span className="action__arrow">→</span>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="model__metrics"
            initial="hidden"
            whileInView="visible"
            viewport={inView}
            variants={stagger}
          >
            {HEADLINE_METRICS.map((m) => (
              <motion.div className="metric" key={m.label} variants={revealX}>
                <span className="metric__label">{m.label}</span>
                <div className="metric__bar">
                  <motion.span
                    className="metric__fill"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: m.pct / 100 }}
                    viewport={inView}
                    transition={{ duration: 1.3, delay: 0.15, ease: EASE }}
                  />
                </div>
                <span className="metric__value readout">{m.value.toFixed(4)}</span>
              </motion.div>
            ))}
            <p className="metric__note label">
              Test set · threshold {THRESHOLD} · historical records
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CLOSE
          ═══════════════════════════════════════════════════════ */}
      <section className="close">
        <motion.div
          className="shell close__inner"
          initial="hidden"
          whileInView="visible"
          viewport={inView}
          variants={stagger}
        >
          <motion.div variants={reveal} custom={0}>
            <Mark size={44} animated />
          </motion.div>
          <motion.h2 className="close__title display" variants={reveal} custom={0.1}>
            Begin exploring
          </motion.h2>
          <motion.p className="close__sub label" variants={reveal} custom={0.18}>
            Historical cyclone systems · North Indian Ocean · 2012 – 2017
          </motion.p>
          <motion.div variants={reveal} custom={0.26}>
            <Link to="/monitor" className="action action--primary" id="cta-enter">
              Open VayuDrishti
              <span className="action__arrow">→</span>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <footer className="foot">
        <div className="shell foot__inner">
          <span className="foot__brand">
            <Mark size={18} tone="mono" />
            VayuDrishti
          </span>
          <span className="foot__note label">
            Historical mode · Test-set metrics · CNN v1 locked
          </span>
        </div>
      </footer>
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────
   Intensity profile — the storm's own best-track wind curve.
   ─────────────────────────────────────────────────────────────── */

function IntensityProfile({ storm }: { storm: (typeof STORMS)[number] }) {
  const W = 520
  const H = 260
  const PAD = { t: 26, r: 18, b: 34, l: 42 }
  const peak = peakKt(storm)
  const maxKt = Math.ceil((peak + 15) / 20) * 20

  const px = (i: number) =>
    PAD.l + (i / (storm.track.length - 1)) * (W - PAD.l - PAD.r)
  const py = (kt: number) => H - PAD.b - (kt / maxKt) * (H - PAD.t - PAD.b)

  const line = storm.track
    .map(([, , kt], i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(kt).toFixed(1)}`)
    .join(' ')
  const area = `${line} L${px(storm.track.length - 1).toFixed(1)} ${H - PAD.b} L${px(0).toFixed(1)} ${H - PAD.b} Z`

  const gridlines = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxKt * f))

  return (
    <figure className="profile">
      <figcaption className="profile__head">
        <span className="panel__title">Best-track intensity</span>
        <span className="panel__meta">{storm.dates[0]} — {storm.dates[1]}</span>
      </figcaption>

      <svg viewBox={`0 0 ${W} ${H}`} className="profile__svg" role="img"
        aria-label={`Intensity profile for ${storm.name}, peaking at ${peak} knots`}>
        <defs>
          <linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(94, 207, 224, 0.26)" />
            <stop offset="100%" stopColor="rgba(94, 207, 224, 0)" />
          </linearGradient>
        </defs>

        {gridlines.map((kt) => (
          <g key={kt}>
            <line x1={PAD.l} y1={py(kt)} x2={W - PAD.r} y2={py(kt)} className="profile__grid" />
            <text x={PAD.l - 8} y={py(kt) + 4} className="profile__axis" textAnchor="end">{kt}</text>
          </g>
        ))}

        <path d={area} fill="url(#profile-fill)" />
        <path d={line} className="profile__line" />

        {storm.track.map(([, , kt], i) => (
          <circle key={i} cx={px(i)} cy={py(kt)} r={kt === peak ? 4.5 : 2.8} fill={ktColor(kt)} />
        ))}

        {/* Landfall marker on the time axis */}
        {storm.landfall && (
          <g>
            <line
              x1={px(storm.track.length - 1)} y1={PAD.t - 6}
              x2={px(storm.track.length - 1)} y2={H - PAD.b}
              className="profile__event"
            />
            <text x={px(storm.track.length - 1) - 6} y={PAD.t - 10}
              className="profile__axis" textAnchor="end">landfall</text>
          </g>
        )}

        <text x={PAD.l} y={H - 10} className="profile__axis">fix 00</text>
        <text x={W - PAD.r} y={H - 10} className="profile__axis" textAnchor="end">
          fix {String(storm.track.length - 1).padStart(2, '0')}
        </text>
        <text x={PAD.l - 34} y={PAD.t - 12} className="profile__axis">kt</text>
      </svg>
    </figure>
  )
}
