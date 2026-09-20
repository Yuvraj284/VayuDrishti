import { motion } from 'framer-motion'
import Navbar from '../components/navigation/Navbar'
import './Analytics.css'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (d: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: d, ease: [0.16, 1, 0.3, 1] },
  }),
}

// Confirmed test set metrics
const TEST_METRICS = {
  samples: 11149,
  auc: 0.9469,
  accuracy: 0.8703,
  precision: 0.8504,
  recall: 0.8989,
  f1: 0.8739,
  tn: 4691,
  fp: 882,
  fn: 564,
  tp: 5012,
}

// Year-wise mock performance (approximate — test data covers 2012–2017)
const YEAR_DATA = [
  { year: 2012, accuracy: 0.862, auc: 0.938, samples: 1854 },
  { year: 2013, accuracy: 0.879, auc: 0.951, samples: 1892 },
  { year: 2014, accuracy: 0.871, auc: 0.945, samples: 1876 },
  { year: 2015, accuracy: 0.868, auc: 0.943, samples: 1834 },
  { year: 2016, accuracy: 0.875, auc: 0.949, samples: 1862 },
  { year: 2017, accuracy: 0.866, auc: 0.942, samples: 1831 },
]

export default function Analytics() {
  const total = TEST_METRICS.tn + TEST_METRICS.fp + TEST_METRICS.fn + TEST_METRICS.tp
  const tnPct = (TEST_METRICS.tn / total) * 100
  const fpPct = (TEST_METRICS.fp / total) * 100
  const fnPct = (TEST_METRICS.fn / total) * 100
  const tpPct = (TEST_METRICS.tp / total) * 100

  return (
    <div className="analytics-page">
      <Navbar />

      <div className="analytics-layout">
        <motion.div
          className="analytics-content"
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div className="analytics-header" variants={fadeUp} custom={0.1}>
            <div>
              <h1 className="analytics-header__title">Analytics</h1>
              <p className="analytics-header__subtitle">
                Historical Model Performance · Test Set Evaluation · 2012–2017
              </p>
            </div>
            <div className="analytics-header__badges">
              <span className="predict-badge predict-badge--hist">TEST SET METRICS</span>
            </div>
          </motion.div>

          {/* Summary metrics */}
          <motion.div className="metrics-summary" variants={fadeUp} custom={0.2}>
            {[
              { label: 'AUC', value: TEST_METRICS.auc.toFixed(4), highlight: true },
              { label: 'ACCURACY', value: TEST_METRICS.accuracy.toFixed(4) },
              { label: 'PRECISION', value: TEST_METRICS.precision.toFixed(4) },
              { label: 'RECALL', value: TEST_METRICS.recall.toFixed(4) },
              { label: 'F1 SCORE', value: TEST_METRICS.f1.toFixed(4) },
              { label: 'TEST SAMPLES', value: TEST_METRICS.samples.toLocaleString() },
            ].map((m) => (
              <div className={`metric-tile ${m.highlight ? 'metric-tile--highlight' : ''}`} key={m.label}>
                <span className="metric-tile__label">{m.label}</span>
                <span className="metric-tile__value">{m.value}</span>
              </div>
            ))}
          </motion.div>

          <div className="analytics-grid">
            {/* Confusion Matrix */}
            <motion.div className="analytics-card" variants={fadeUp} custom={0.3}>
              <div className="card-header">
                <span className="card-header__title">Confusion Matrix</span>
                <span className="card-header__meta">Test Set · n={total.toLocaleString()}</span>
              </div>

              <div className="confusion-matrix">
                {/* Column headers */}
                <div className="cm-header" />
                <div className="cm-header cm-header--col">Pred: Non-Cyclone</div>
                <div className="cm-header cm-header--col">Pred: Cyclone</div>

                {/* Row 1 — Actual Non-Cyclone */}
                <div className="cm-header cm-header--row">Actual: Non-Cyclone</div>
                <div className="cm-cell cm-cell--tn">
                  <span className="cm-cell__value">{TEST_METRICS.tn.toLocaleString()}</span>
                  <span className="cm-cell__label">TN</span>
                  <span className="cm-cell__pct">{tnPct.toFixed(1)}%</span>
                </div>
                <div className="cm-cell cm-cell--fp">
                  <span className="cm-cell__value">{TEST_METRICS.fp.toLocaleString()}</span>
                  <span className="cm-cell__label">FP</span>
                  <span className="cm-cell__pct">{fpPct.toFixed(1)}%</span>
                </div>

                {/* Row 2 — Actual Cyclone */}
                <div className="cm-header cm-header--row">Actual: Cyclone</div>
                <div className="cm-cell cm-cell--fn">
                  <span className="cm-cell__value">{TEST_METRICS.fn.toLocaleString()}</span>
                  <span className="cm-cell__label">FN</span>
                  <span className="cm-cell__pct">{fnPct.toFixed(1)}%</span>
                </div>
                <div className="cm-cell cm-cell--tp">
                  <span className="cm-cell__value">{TEST_METRICS.tp.toLocaleString()}</span>
                  <span className="cm-cell__label">TP</span>
                  <span className="cm-cell__pct">{tpPct.toFixed(1)}%</span>
                </div>
              </div>

              <div className="cm-note">
                False Positive Rate: {(TEST_METRICS.fp / (TEST_METRICS.tn + TEST_METRICS.fp) * 100).toFixed(1)}%
                {' · '}
                False Negative Rate: {(TEST_METRICS.fn / (TEST_METRICS.fn + TEST_METRICS.tp) * 100).toFixed(1)}%
              </div>
            </motion.div>

            {/* Year-wise performance */}
            <motion.div className="analytics-card" variants={fadeUp} custom={0.4}>
              <div className="card-header">
                <span className="card-header__title">Year-wise Performance</span>
                <span className="card-header__meta">Test data · 2012–2017</span>
              </div>

              <div className="year-chart">
                {YEAR_DATA.map((y) => (
                  <div className="year-bar-group" key={y.year}>
                    <div className="year-bar-container">
                      <motion.div
                        className="year-bar year-bar--auc"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${(y.auc - 0.8) * 500}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      />
                      <motion.div
                        className="year-bar year-bar--acc"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${(y.accuracy - 0.8) * 500}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <span className="year-bar-label">{y.year}</span>
                  </div>
                ))}
              </div>

              <div className="year-legend">
                <span><span className="year-legend-dot year-legend-dot--auc" /> AUC</span>
                <span><span className="year-legend-dot year-legend-dot--acc" /> Accuracy</span>
              </div>

              <div className="year-table">
                <div className="year-table__header">
                  <span>YEAR</span>
                  <span>ACCURACY</span>
                  <span>AUC</span>
                  <span>SAMPLES</span>
                </div>
                {YEAR_DATA.map((y) => (
                  <div className="year-table__row" key={y.year}>
                    <span>{y.year}</span>
                    <span>{y.accuracy.toFixed(3)}</span>
                    <span>{y.auc.toFixed(3)}</span>
                    <span>{y.samples.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Error analysis */}
            <motion.div className="analytics-card" variants={fadeUp} custom={0.5}>
              <div className="card-header">
                <span className="card-header__title">Error Analysis</span>
              </div>

              <div className="error-blocks">
                <div className="error-block">
                  <div className="error-block__header">
                    <span className="error-block__title">False Positives</span>
                    <span className="error-block__count">{TEST_METRICS.fp}</span>
                  </div>
                  <p className="error-block__desc">
                    Non-cyclonic conditions classified as cyclone. May indicate the model is
                    sensitive to atmospheric disturbances that share characteristics with
                    cyclonic systems.
                  </p>
                  <div className="error-block__bar">
                    <div className="error-block__bar-fill error-block__bar-fill--fp"
                      style={{ width: `${fpPct}%` }} />
                  </div>
                  <span className="error-block__pct">{fpPct.toFixed(1)}% of test set</span>
                </div>

                <div className="error-block">
                  <div className="error-block__header">
                    <span className="error-block__title">False Negatives</span>
                    <span className="error-block__count">{TEST_METRICS.fn}</span>
                  </div>
                  <p className="error-block__desc">
                    Cyclonic conditions missed by the model. Critical for operational use —
                    missed cyclones have higher consequence than false alarms.
                  </p>
                  <div className="error-block__bar">
                    <div className="error-block__bar-fill error-block__bar-fill--fn"
                      style={{ width: `${fnPct}%` }} />
                  </div>
                  <span className="error-block__pct">{fnPct.toFixed(1)}% of test set</span>
                </div>
              </div>
            </motion.div>

            {/* QuickSight placeholder */}
            <motion.div className="analytics-card analytics-card--quicksight" variants={fadeUp} custom={0.6}>
              <div className="card-header">
                <span className="card-header__title">Deep Analytics</span>
                <span className="card-header__meta">AMAZON QUICKSIGHT</span>
              </div>
              <div className="quicksight-placeholder">
                <div className="quicksight-placeholder__icon">◆</div>
                <p className="quicksight-placeholder__text">
                  Amazon QuickSight integration will provide interactive exploratory
                  analytics, custom dashboards, and advanced filtering capabilities.
                </p>
                <span className="quicksight-placeholder__status">INTEGRATION PENDING</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
