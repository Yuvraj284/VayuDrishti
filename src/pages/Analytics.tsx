import { motion } from 'framer-motion'
import Nav from '../components/layout/Nav'
import { HEADLINE_METRICS, TEST_METRICS, THRESHOLD, YEAR_DATA } from '../data/model'
import { EASE, inView, reveal, stagger } from '../motion'
import './Analytics.css'

export default function Analytics() {
  const { tn, fp, fn, tp } = TEST_METRICS
  const total = tn + fp + fn + tp

  const pct = (n: number) => (n / total) * 100
  const fpr = (fp / (tn + fp)) * 100
  const fnr = (fn / (fn + tp)) * 100

  const CELLS = [
    { key: 'tn', label: 'True negative', short: 'TN', value: tn, tone: 'cool' },
    { key: 'fp', label: 'False positive', short: 'FP', value: fp, tone: 'warn' },
    { key: 'fn', label: 'False negative', short: 'FN', value: fn, tone: 'bad' },
    { key: 'tp', label: 'True positive', short: 'TP', value: tp, tone: 'good' },
  ]

  return (
    <div className="analytics route-fade">
      <Nav />

      <div className="shell analytics__shell">
        {/* ── Header ── */}
        <motion.header
          className="page-head"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={reveal} custom={0.05}>
            <div className="eyebrow">Model evaluation</div>
            <h1 className="page-head__title display">Analytics</h1>
            <p className="page-head__sub prose">
              Held-out test performance for VayuDrishti CNN v1 across the
              2012–2017 archive, at a decision threshold of {THRESHOLD}.
            </p>
          </motion.div>
          <motion.div className="page-head__badges" variants={reveal} custom={0.14}>
            <span className="pill pill--lock">
              <span className="pill__dot" />
              Test-set metrics
            </span>
          </motion.div>
        </motion.header>

        {/* ═══ HEADLINE NUMBERS ═══ */}
        <motion.section
          className="kpis"
          initial="hidden"
          whileInView="visible"
          viewport={inView}
          variants={stagger}
        >
          {HEADLINE_METRICS.map((m, i) => (
            <motion.div
              className={`kpi ${i === 0 ? 'kpi--lead' : ''}`}
              key={m.label}
              variants={reveal}
              custom={i * 0.05}
            >
              <span className="kpi__label label">{m.label}</span>
              <span className="kpi__value readout">{m.value.toFixed(4)}</span>
            </motion.div>
          ))}
          <motion.div className="kpi" variants={reveal} custom={0.3}>
            <span className="kpi__label label">Test samples</span>
            <span className="kpi__value readout">{TEST_METRICS.samples.toLocaleString()}</span>
          </motion.div>
        </motion.section>

        <div className="analytics__grid">
          {/* ═══ CONFUSION MATRIX ═══ */}
          <motion.section
            className="panel"
            initial="hidden"
            whileInView="visible"
            viewport={inView}
            variants={reveal}
            custom={0.1}
          >
            <div className="panel__head">
              <span className="panel__title">Confusion matrix</span>
              <span className="panel__meta">n = {total.toLocaleString()}</span>
            </div>

            <div className="panel__body">
              <div className="cm">
                <span className="cm__corner label">actual ╲ predicted</span>
                <span className="cm__col-head label">Non-cyclone</span>
                <span className="cm__col-head label">Cyclone</span>

                <span className="cm__row-head label">Non-cyclone</span>
                <Cell cell={CELLS[0]} pct={pct(CELLS[0].value)} />
                <Cell cell={CELLS[1]} pct={pct(CELLS[1].value)} />

                <span className="cm__row-head label">Cyclone</span>
                <Cell cell={CELLS[2]} pct={pct(CELLS[2].value)} />
                <Cell cell={CELLS[3]} pct={pct(CELLS[3].value)} />
              </div>

              <div className="cm__rates">
                <div className="kv">
                  <span className="kv__k">False positive rate</span>
                  <span className="kv__v">{fpr.toFixed(1)}%</span>
                </div>
                <div className="kv">
                  <span className="kv__k">False negative rate</span>
                  <span className="kv__v">{fnr.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ═══ ERROR ANALYSIS ═══ */}
          <motion.section
            className="panel"
            initial="hidden"
            whileInView="visible"
            viewport={inView}
            variants={reveal}
            custom={0.16}
          >
            <div className="panel__head">
              <span className="panel__title">Error analysis</span>
            </div>
            <div className="panel__body">
              <article className="err">
                <header className="err__head">
                  <h3 className="err__title">False positives</h3>
                  <span className="err__count readout">{fp}</span>
                </header>
                <p className="err__body">
                  Non-cyclonic conditions classified as cyclone. Suggests sensitivity to
                  atmospheric disturbances that share structure with cyclonic systems —
                  monsoon depressions and sheared lows in particular.
                </p>
                <div className="err__bar">
                  <motion.span
                    className="err__fill err__fill--fp"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: pct(fp) / 100 }}
                    viewport={inView}
                    transition={{ duration: 1.1, ease: EASE }}
                  />
                </div>
                <span className="err__pct label">{pct(fp).toFixed(1)}% of test set</span>
              </article>

              <article className="err">
                <header className="err__head">
                  <h3 className="err__title">False negatives</h3>
                  <span className="err__count readout">{fn}</span>
                </header>
                <p className="err__body">
                  Cyclonic conditions the model missed. The consequential error class for
                  operational use — a missed system costs more than a false alarm, which
                  is why the threshold sits below 0.5 on the precision side.
                </p>
                <div className="err__bar">
                  <motion.span
                    className="err__fill err__fill--fn"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: pct(fn) / 100 }}
                    viewport={inView}
                    transition={{ duration: 1.1, ease: EASE }}
                  />
                </div>
                <span className="err__pct label">{pct(fn).toFixed(1)}% of test set</span>
              </article>
            </div>
          </motion.section>

          {/* ═══ YEAR-WISE ═══ */}
          <motion.section
            className="panel analytics__wide"
            initial="hidden"
            whileInView="visible"
            viewport={inView}
            variants={reveal}
            custom={0.2}
          >
            <div className="panel__head">
              <span className="panel__title">Year-wise performance</span>
              <span className="panel__meta">Approximate split · 2012–2017</span>
            </div>

            <div className="panel__body">
              <YearChart />

              <div className="ytable">
                <div className="ytable__row ytable__row--head">
                  <span className="label">Year</span>
                  <span className="label">Accuracy</span>
                  <span className="label">AUC</span>
                  <span className="label">Samples</span>
                </div>
                {YEAR_DATA.map((y) => (
                  <div className="ytable__row" key={y.year}>
                    <span className="readout">{y.year}</span>
                    <span className="readout">{y.accuracy.toFixed(3)}</span>
                    <span className="readout">{y.auc.toFixed(3)}</span>
                    <span className="readout">{y.samples.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <p className="bench__note">
                The pooled test-set figures above are the confirmed evaluation. This
                per-year breakdown is an approximate split held for illustration and is
                not a separate validated result.
              </p>
            </div>
          </motion.section>

          {/* ═══ QUICKSIGHT ═══ */}
          <motion.section
            className="panel analytics__wide qs"
            initial="hidden"
            whileInView="visible"
            viewport={inView}
            variants={reveal}
            custom={0.24}
          >
            <div className="panel__head">
              <span className="panel__title">Deep analytics</span>
              <span className="panel__meta">Amazon QuickSight</span>
            </div>
            <div className="panel__body qs__body">
              <div className="qs__text">
                <p className="prose">
                  Interactive exploratory analysis — custom dashboards, cross-filtering
                  across basins and seasons, and per-sample drill-down into the
                  classifier&apos;s errors — will be served from a QuickSight dataset.
                </p>
                <span className="pill">Integration pending</span>
              </div>
              <div className="qs__placeholder" aria-hidden="true">
                <span className="qs__grid" />
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────
   Confusion matrix cell — the square's ink scales with its share,
   so the two error classes read at a glance against the diagonal.
   ─────────────────────────────────────────────────────────────── */

function Cell({
  cell,
  pct,
}: {
  cell: { key: string; label: string; short: string; value: number; tone: string }
  pct: number
}) {
  return (
    <div className={`cm__cell cm__cell--${cell.tone}`}>
      <span className="cm__cell-wash" style={{ opacity: 0.1 + (pct / 50) * 0.5 }} />
      <span className="cm__cell-value readout">{cell.value.toLocaleString()}</span>
      <span className="cm__cell-short label">{cell.short}</span>
      <span className="cm__cell-pct readout">{pct.toFixed(1)}%</span>
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────
   Year chart — grouped bars on a real axis. The original rendered
   bars with no scale at all; a zero-suppressed axis is labelled as
   such so the differences are not overstated.
   ─────────────────────────────────────────────────────────────── */

function YearChart() {
  const W = 760
  const H = 250
  const PAD = { t: 18, r: 14, b: 42, l: 46 }

  const MIN = 0.84
  const MAX = 0.96
  const y = (v: number) => H - PAD.b - ((v - MIN) / (MAX - MIN)) * (H - PAD.t - PAD.b)

  const slot = (W - PAD.l - PAD.r) / YEAR_DATA.length
  const barW = Math.min(20, slot / 3.2)

  const gridlines = [0.84, 0.87, 0.9, 0.93, 0.96]

  return (
    <figure className="ychart">
      <svg viewBox={`0 0 ${W} ${H}`} className="ychart__svg" role="img"
        aria-label="Year-wise AUC and accuracy, 2012 to 2017">
        {gridlines.map((g) => (
          <g key={g}>
            <line x1={PAD.l} y1={y(g)} x2={W - PAD.r} y2={y(g)} className="ychart__grid" />
            <text x={PAD.l - 10} y={y(g) + 4} className="ychart__axis" textAnchor="end">
              {g.toFixed(2)}
            </text>
          </g>
        ))}

        {YEAR_DATA.map((d, i) => {
          const cx = PAD.l + slot * i + slot / 2
          return (
            <g key={d.year}>
              <rect
                x={cx - barW - 2} y={y(d.auc)}
                width={barW} height={H - PAD.b - y(d.auc)}
                className="ychart__bar ychart__bar--auc"
              />
              <rect
                x={cx + 2} y={y(d.accuracy)}
                width={barW} height={H - PAD.b - y(d.accuracy)}
                className="ychart__bar ychart__bar--acc"
              />
              <text x={cx} y={H - PAD.b + 18} className="ychart__axis" textAnchor="middle">
                {d.year}
              </text>
            </g>
          )
        })}

        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} className="ychart__base" />
      </svg>

      <figcaption className="ychart__legend">
        <span className="ychart__key">
          <span className="ychart__swatch ychart__swatch--auc" /> AUC
        </span>
        <span className="ychart__key">
          <span className="ychart__swatch ychart__swatch--acc" /> Accuracy
        </span>
        <span className="ychart__note label">axis truncated at 0.84</span>
      </figcaption>
    </figure>
  )
}
