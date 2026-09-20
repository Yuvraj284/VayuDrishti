import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAlerts } from '../../alerts/context'
import { describeFreshness, type AlertRecord, type Basin } from '../../alerts/types'
import { formatStamp } from '../../alerts/evaluate'
import { TRANSPORTS } from '../../alerts/transport'
import { THRESHOLD } from '../../data/model'
import { intensityLabel, type StormCategory } from '../../data/storms'
import { EASE } from '../../motion'
import './AlertsPanel.css'

const BASINS: Basin[] = ['Bay of Bengal', 'Arabian Sea']
const CATEGORIES: (StormCategory | 'any')[] = ['any', 'TD', 'CS', 'SCS', 'VSCS', 'ESCS']

function Switch({
  on,
  onChange,
  label,
  disabled = false,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={`switch ${on ? 'switch--on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="switch__track">
        <span className="switch__thumb" />
      </span>
    </button>
  )
}

export default function AlertsPanel() {
  const {
    prefs,
    selected,
    allRecords,
    setEnabled,
    setCriteria,
    setChannel,
    reset,
    panelOpen,
    setPanelOpen,
  } = useAlerts()

  // Escape closes; the body keeps its scroll position underneath.
  useEffect(() => {
    if (!panelOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen, setPanelOpen])

  const { criteria, channels } = prefs
  const officialCount = selected.filter((r) => r.kind === 'official').length

  const toggleBasin = (b: Basin) => {
    const next = criteria.basins.includes(b)
      ? criteria.basins.filter((x) => x !== b)
      : [...criteria.basins, b]
    setCriteria({ basins: next })
  }

  return (
    <AnimatePresence>
      {panelOpen && (
        <>
          <motion.div
            className="alerts__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            onClick={() => setPanelOpen(false)}
          />

          <motion.aside
            className="alerts"
            role="dialog"
            aria-label="Cyclone alerts"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.62, ease: EASE }}
          >
            {/* ── Header ── */}
            <header className="alerts__head">
              <div>
                <span className="label">Alert configuration</span>
                <h2 className="alerts__title display">Cyclone alerts</h2>
              </div>
              <button
                className="alerts__close"
                onClick={() => setPanelOpen(false)}
                aria-label="Close alerts"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
                  <path
                    d="M1.5 1.5 L13.5 13.5 M13.5 1.5 L1.5 13.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>

            <div className="alerts__body">
              {/* ── Mode notice: unmissable, and never styled as a live alarm ── */}
              <section className="notice">
                <span className="notice__tag label">Archive mode</span>
                <p className="notice__text">
                  VayuDrishti is running on the 2012–2017 historical archive. Everything in
                  this feed is a replay of a past system.{' '}
                  <strong>Nothing here is a live alert</strong>, and no record is delivered
                  to an external channel.
                </p>
                <p className="notice__text notice__text--dim">
                  For operational warnings, consult the India Meteorological Department.
                  VayuDrishti does not issue official warnings.
                </p>
              </section>

              {/* ── Master switch ── */}
              <section className="alerts__master">
                <div>
                  <span className="alerts__master-label">Enable cyclone alerts</span>
                  <span className="alerts__master-sub label">
                    {prefs.enabled
                      ? `${selected.length} of ${allRecords.length} archived systems match`
                      : 'Evaluation paused'}
                  </span>
                </div>
                <Switch on={prefs.enabled} onChange={setEnabled} label="Enable cyclone alerts" />
              </section>

              {/* ── Criteria ── */}
              <fieldset className="block" disabled={!prefs.enabled}>
                <legend className="block__title label">Detection criteria</legend>

                <div className="row">
                  <div className="row__text">
                    <span className="row__label">Classifier detection</span>
                    <span className="row__hint">
                      Raise a record when CNN v1 flags a system as cyclonic.
                    </span>
                  </div>
                  <Switch
                    on={criteria.onDetection}
                    onChange={(v) => setCriteria({ onDetection: v })}
                    label="Classifier detection"
                    disabled={!prefs.enabled}
                  />
                </div>

                <div className="field">
                  <div className="field__head">
                    <span className="row__label">Probability threshold</span>
                    <span className="field__value readout">
                      {criteria.minProbability.toFixed(2)}
                    </span>
                  </div>
                  <input
                    className="slider"
                    type="range"
                    min={0.3}
                    max={0.99}
                    step={0.01}
                    value={criteria.minProbability}
                    onChange={(e) => setCriteria({ minProbability: Number(e.target.value) })}
                    aria-label="Minimum cyclone probability"
                  />
                  <div className="field__scale">
                    <span className="label">0.30</span>
                    <span className="label field__scale-mark">model threshold {THRESHOLD}</span>
                    <span className="label">0.99</span>
                  </div>
                </div>

                <div className="field">
                  <span className="row__label">Minimum intensity</span>
                  <div className="chips" role="group" aria-label="Minimum intensity">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`chip ${criteria.minCategory === c ? 'chip--on' : ''}`}
                        onClick={() => setCriteria({ minCategory: c })}
                        aria-pressed={criteria.minCategory === c}
                      >
                        {c === 'any' ? 'Any' : c}
                      </button>
                    ))}
                  </div>
                  <span className="row__hint">
                    {criteria.minCategory === 'any'
                      ? 'Every classified system, including depressions.'
                      : `${intensityLabel(criteria.minCategory)} and above (IMD scale).`}
                  </span>
                </div>

                <div className="field">
                  <span className="row__label">Basins watched</span>
                  <div className="chips" role="group" aria-label="Basins watched">
                    {BASINS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        className={`chip ${criteria.basins.includes(b) ? 'chip--on' : ''}`}
                        onClick={() => toggleBasin(b)}
                        aria-pressed={criteria.basins.includes(b)}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                  {criteria.basins.length === 0 && (
                    <span className="row__hint row__hint--warn">
                      No basin selected — nothing will match.
                    </span>
                  )}
                </div>
              </fieldset>

              {/* ── Delivery ── */}
              <fieldset className="block" disabled={!prefs.enabled}>
                <legend className="block__title label">Delivery</legend>
                {TRANSPORTS.map((t) => {
                  const connected = t.status === 'active'
                  return (
                    <div className="row" key={t.id}>
                      <div className="row__text">
                        <span className="row__label">
                          {t.label}
                          {!connected && <span className="row__badge">Not connected</span>}
                        </span>
                        <span className="row__hint">
                          {connected ? t.description : `Requires ${t.requires}.`}
                        </span>
                      </div>
                      <Switch
                        on={connected && channels[t.id]}
                        onChange={(v) => setChannel(t.id, v)}
                        label={t.label}
                        disabled={!prefs.enabled || !connected}
                      />
                    </div>
                  )
                })}
              </fieldset>

              {/* ── Feed ── */}
              <section className="block">
                <div className="block__head">
                  <span className="block__title label">Matching records</span>
                  <span className="panel__meta">{selected.length}</span>
                </div>

                {!prefs.enabled && (
                  <p className="empty">Turn alerts on to evaluate the archive.</p>
                )}

                {prefs.enabled && selected.length === 0 && (
                  <p className="empty">
                    No archived system meets these criteria. Lower the probability
                    threshold or the minimum intensity.
                  </p>
                )}

                {prefs.enabled &&
                  selected.map((r) => <AlertCard key={r.id} record={r} />)}
              </section>

              {/* ── Official warnings ── */}
              <section className="block">
                <div className="block__head">
                  <span className="block__title label">Official warnings</span>
                  <span className="panel__meta">{officialCount}</span>
                </div>
                <div className="official">
                  <span className="official__state label">No authority feed connected</span>
                  <p className="row__hint">
                    Official bulletins come from IMD and the other regional centres.
                    VayuDrishti shows them alongside its own detections when a feed is
                    attached — it never generates them, and a model detection is not a
                    warning.
                  </p>
                </div>
              </section>

              <button className="alerts__reset" onClick={reset}>
                Reset to defaults
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/* ───────────────────────────────────────────────────────────────
   One record. Provenance is part of the card, not a tooltip: a
   detection is only meaningful next to what produced it and when.
   ─────────────────────────────────────────────────────────────── */

function AlertCard({ record }: { record: AlertRecord }) {
  const fresh = describeFreshness(record)

  return (
    <article className={`card card--${record.severity}`}>
      <div className="card__top">
        <span className={`card__kind card__kind--${record.kind}`}>
          {record.kind === 'detection' ? 'ML detection' : 'Official'}
        </span>
        <span className={`card__fresh card__fresh--${fresh.tone}`}>{fresh.label}</span>
      </div>

      <h3 className="card__headline">{record.headline}</h3>
      <p className="card__detail">{record.detail}</p>

      {record.probability != null && (
        <div className="card__prob">
          <div className="card__prob-track">
            <span
              className="card__prob-fill"
              style={{ transform: `scaleX(${record.probability})` }}
            />
            <span
              className="card__prob-threshold"
              style={{ left: `${(record.threshold ?? THRESHOLD) * 100}%` }}
            />
          </div>
          <span className="card__prob-value readout">{record.probability.toFixed(3)}</span>
        </div>
      )}

      <dl className="card__meta">
        <div>
          <dt className="label">Source</dt>
          <dd className="readout">{record.source}</dd>
        </div>
        <div>
          <dt className="label">Observed</dt>
          <dd className="readout">{formatStamp(record.observedAt)}</dd>
        </div>
        <div>
          <dt className="label">Prediction run</dt>
          <dd className="readout card__na">
            {record.predictedAt ? formatStamp(record.predictedAt) : 'n/a · archive replay'}
          </dd>
        </div>
        <div>
          <dt className="label">Freshness</dt>
          <dd className="readout">{fresh.detail}</dd>
        </div>
      </dl>

      {record.archival && <span className="card__stamp">Archive replay · not a live alert</span>}
    </article>
  )
}
