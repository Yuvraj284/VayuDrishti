import { useState } from 'react'
import { motion } from 'framer-motion'
import Nav from '../components/layout/Nav'
import FieldTile from '../components/data/FieldTile'
import { ARCHITECTURE, ARCH_SHAPES, CHANNELS, MODEL_CONFIG, THRESHOLD } from '../data/model'
import { EASE, inView, reveal, stagger } from '../motion'
import './Predict.css'

export default function Predict() {
  /* ── Inference state. The model is locked; this mirrors its contract. ── */
  const [probability, setProbability] = useState(0.923)
  const [isRunning, setIsRunning] = useState(false)
  const [epoch, setEpoch] = useState(0)
  const threshold = THRESHOLD
  const isCyclone = probability >= threshold

  const handleInference = () => {
    setIsRunning(true)
    // Simulate inference delay
    setTimeout(() => {
      setProbability(0.85 + Math.random() * 0.12)
      setEpoch((e) => e + 1)
      setIsRunning(false)
    }, 1800)
  }

  const margin = probability - threshold

  return (
    <div className="predict route-fade">
      <Nav />

      <div className="shell predict__shell">
        {/* ── Header ── */}
        <motion.header
          className="page-head"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={reveal} custom={0.05}>
            <div className="eyebrow">Inference bench</div>
            <h1 className="page-head__title display">Prediction interface</h1>
            <p className="page-head__sub prose">
              VayuDrishti CNN v1 · binary cyclone classification over a ten-channel
              meteorological window.
            </p>
          </motion.div>
          <motion.div className="page-head__badges" variants={reveal} custom={0.14}>
            <span className="pill pill--lock">
              <span className="pill__dot" />
              Model locked
            </span>
            <span className="pill">Historical data</span>
          </motion.div>
        </motion.header>

        <div className="predict__grid">
          {/* ═══ INPUT ═══ */}
          <motion.section
            className="panel bench"
            initial="hidden"
            whileInView="visible"
            viewport={inView}
            variants={reveal}
            custom={0.1}
          >
            <div className="panel__head">
              <span className="panel__title">Input tensor</span>
              <span className="panel__meta">[10, 80, 80] · float32</span>
            </div>

            <div className="panel__body">
              <div className="fields">
                {CHANNELS.map((ch, i) => (
                  <figure className="field-tile" key={ch.code}>
                    <div className="field-tile__frame">
                      <FieldTile channel={ch} index={i} epoch={epoch} />
                      <span className="field-tile__index readout">{i}</span>
                    </div>
                    <figcaption className="field-tile__cap">
                      <span className="field-tile__code">{ch.code}</span>
                      <span className="field-tile__unit">{ch.unit}</span>
                    </figcaption>
                    <span className="field-tile__name">{ch.name}</span>
                  </figure>
                ))}
              </div>

              <p className="bench__note">
                Mock fields at the grid&apos;s native 80 × 80 resolution. Channel-to-variable
                mapping is indicative; the authoritative ordering comes from the training
                artefacts.
              </p>
            </div>
          </motion.section>

          {/* ═══ RESULT ═══ */}
          <div className="predict__side">
            <motion.section
              className="panel"
              initial="hidden"
              whileInView="visible"
              viewport={inView}
              variants={reveal}
              custom={0.18}
            >
              <div className="panel__head">
                <span className="panel__title">Inference result</span>
                <span className={`panel__meta ${isRunning ? 'panel__meta--busy' : ''}`}>
                  {isRunning ? 'Processing' : 'Ready'}
                </span>
              </div>

              <div className="panel__body">
                <div className="verdict-big">
                  <span className="label">P(cyclone)</span>
                  <motion.span
                    key={probability}
                    className={`verdict-big__value readout ${isCyclone ? 'is-positive' : 'is-negative'}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                  >
                    {probability.toFixed(4)}
                  </motion.span>
                  <span className={`verdict-big__class ${isCyclone ? 'is-positive' : 'is-negative'}`}>
                    <span className="pill__dot" />
                    {isCyclone ? 'Cyclone' : 'Non-cyclone'}
                  </span>
                </div>

                {/* Threshold scale */}
                <div className="scale">
                  <div className="scale__ticks">
                    <span className="label">0.0</span>
                    <span className="label scale__ticks-mid">threshold {threshold}</span>
                    <span className="label">1.0</span>
                  </div>

                  <div className="scale__track">
                    <motion.span
                      className="scale__fill"
                      animate={{ scaleX: probability }}
                      transition={{ duration: 0.9, ease: EASE }}
                    />
                    <span className="scale__threshold" style={{ left: `${threshold * 100}%` }} />
                    <motion.span
                      className="scale__needle"
                      animate={{ left: `${probability * 100}%` }}
                      transition={{ duration: 0.9, ease: EASE }}
                    />
                  </div>

                  <div className="scale__zones">
                    <span className="label">Non-cyclone</span>
                    <span className="label">Cyclone</span>
                  </div>
                </div>

                <div className="kv">
                  <span className="kv__k">Margin over threshold</span>
                  <span className="kv__v" style={{ color: margin >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                    {margin >= 0 ? '+' : ''}{margin.toFixed(4)}
                  </span>
                </div>

                <button
                  className={`run ${isRunning ? 'run--busy' : ''}`}
                  onClick={handleInference}
                  disabled={isRunning}
                  id="btn-run-inference"
                >
                  <span className="run__label">
                    {isRunning ? 'Running inference' : 'Run inference'}
                  </span>
                  <span className="run__tag">mock</span>
                  {isRunning && <span className="run__progress" />}
                </button>
              </div>
            </motion.section>

            {/* ═══ CONFIG ═══ */}
            <motion.section
              className="panel"
              initial="hidden"
              whileInView="visible"
              viewport={inView}
              variants={reveal}
              custom={0.26}
            >
              <div className="panel__head">
                <span className="panel__title">Model configuration</span>
              </div>
              <div className="panel__body">
                {MODEL_CONFIG.map(([k, v]) => (
                  <div className="kv" key={k}>
                    <span className="kv__k">{k}</span>
                    <span className="kv__v">{v}</span>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ═══ ARCHITECTURE ═══ */}
            <motion.section
              className="panel"
              initial="hidden"
              whileInView="visible"
              viewport={inView}
              variants={reveal}
              custom={0.32}
            >
              <div className="panel__head">
                <span className="panel__title">Forward pass</span>
                <span className="panel__meta">317,665 params</span>
              </div>
              <div className="panel__body">
                <ol className="arch">
                  {ARCHITECTURE.map((layer, i) => (
                    <li className="arch__step" key={layer}>
                      <span className="arch__index readout">{String(i).padStart(2, '0')}</span>
                      <span className="arch__body">
                        <span className="arch__op">{layer}</span>
                        <span className="arch__shape readout">{ARCH_SHAPES[i]}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="arch__out">
                  <span className="label">Sigmoid</span>
                  <span className="arch__out-value readout">P(cyclone)</span>
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  )
}
