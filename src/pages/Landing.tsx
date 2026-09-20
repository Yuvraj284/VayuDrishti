import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/navigation/Navbar'
import CycloneScene from '../components/atmospheric/CycloneScene'
import ScientificOverlay from '../components/scientific/ScientificOverlay'
import './Landing.css'

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: (d: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 1, delay: d, ease: [0.16, 1, 0.3, 1] },
  }),
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const metricIn = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export default function Landing() {
  const heroRef = useRef<HTMLElement>(null)

  return (
    <div className="landing">
      <Navbar />

      {/* ═══ HERO ═══ */}
      <section className="hero" ref={heroRef} id="hero-section">
        {/* Cyclone — full bleed background */}
        <div className="hero__cyclone">
          <CycloneScene className="hero__canvas" />
          <ScientificOverlay />
          <div className="hero__vignette" />
        </div>

        {/* Text content — left side */}
        <motion.div
          className="hero__content"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.p className="hero__eyebrow" variants={reveal} custom={0.4}>
            Cyclone Intelligence
          </motion.p>

          <motion.h1 className="hero__title" variants={reveal} custom={0.55}>
            VayuDrishti
          </motion.h1>

          <motion.p className="hero__subtitle" variants={reveal} custom={0.7}>
            Atmospheric vision through<br />
            machine learning.
          </motion.p>

          <motion.div className="hero__actions" variants={reveal} custom={0.9}>
            <Link to="/monitor" className="hero__cta hero__cta--primary" id="cta-explore">
              Explore the archive
            </Link>
            <Link to="/predict" className="hero__cta hero__cta--ghost" id="cta-model">
              View model
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll nudge */}
        <motion.div
          className="hero__scroll"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1 }}
        >
          <div className="hero__scroll-line" />
        </motion.div>
      </section>

      {/* ═══ NARRATIVE — Editorial storm brief ═══ */}
      <section className="narrative" id="section-narrative">
        <div className="narrative__inner">
          <motion.div
            className="narrative__storm"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div className="narrative__label-group" variants={reveal} custom={0}>
              <span className="narrative__label">Bay of Bengal · 2013</span>
            </motion.div>

            <motion.h2 className="narrative__storm-name" variants={reveal} custom={0.1}>
              Phailin
            </motion.h2>

            <motion.div className="narrative__vitals" variants={reveal} custom={0.25}>
              <div className="vital">
                <span className="vital__value">115 kt</span>
                <span className="vital__label">peak intensity</span>
              </div>
              <div className="vital__sep" />
              <div className="vital">
                <span className="vital__value">940 hPa</span>
                <span className="vital__label">minimum pressure</span>
              </div>
              <div className="vital__sep" />
              <div className="vital">
                <span className="vital__value">ESCS</span>
                <span className="vital__label">category</span>
              </div>
            </motion.div>

            <motion.p className="narrative__description" variants={reveal} custom={0.35}>
              Extremely severe cyclonic storm Phailin made landfall near Gopalpur,
              Odisha on 12 October 2013 — one of the strongest tropical cyclones
              to strike the Indian subcontinent in two decades. VayuDrishti's CNN
              classifies this system with a probability of <span className="narrative__prob">0.967</span>.
            </motion.p>
          </motion.div>

          {/* Track preview hint */}
          <motion.div
            className="narrative__cta"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.9 }}
          >
            <Link to="/monitor" className="narrative__track-link" id="cta-track">
              View track on map
              <span className="narrative__track-arrow">→</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ MODEL — Restrained presentation ═══ */}
      <section className="model-section" id="section-model">
        <div className="model-section__inner">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.span className="section-tag" variants={reveal} custom={0}>
              VayuDrishti CNN v1
            </motion.span>

            <motion.h2 className="model-section__title" variants={reveal} custom={0.1}>
              Binary cyclone classification
            </motion.h2>

            <motion.p className="model-section__desc" variants={reveal} custom={0.2}>
              A convolutional neural network trained on 10-channel meteorological
              grids — wind, pressure, humidity, temperature, and vorticity —
              to distinguish cyclonic from non-cyclonic atmospheric states.
              Evaluated on 11,149 held-out samples spanning 2012–2017.
            </motion.p>

            {/* Metrics */}
            <motion.div
              className="metrics-block"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              {[
                { label: 'AUC',       value: '0.9469', pct: 94.69 },
                { label: 'Accuracy',  value: '0.8703', pct: 87.03 },
                { label: 'Precision', value: '0.8504', pct: 85.04 },
                { label: 'Recall',    value: '0.8989', pct: 89.89 },
                { label: 'F1',        value: '0.8739', pct: 87.39 },
              ].map((m) => (
                <motion.div className="metric" key={m.label} variants={metricIn}>
                  <span className="metric__label">{m.label}</span>
                  <div className="metric__bar">
                    <motion.div
                      className="metric__fill"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${m.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className="metric__value">{m.value}</span>
                </motion.div>
              ))}

              <p className="metrics-note">
                Test set performance · threshold 0.57 · historical records
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="cta-section" id="section-cta">
        <motion.div
          className="cta-section__inner"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          <motion.h2 className="cta-section__title" variants={reveal} custom={0}>
            Begin exploring
          </motion.h2>
          <motion.p className="cta-section__sub" variants={reveal} custom={0.12}>
            Historical cyclone systems · Bay of Bengal · 2012–2017
          </motion.p>
          <motion.div variants={reveal} custom={0.24}>
            <Link to="/monitor" className="hero__cta hero__cta--primary" id="cta-enter">
              Open VayuDrishti
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer__inner">
          <span className="footer__brand">VayuDrishti</span>
          <span className="footer__note">Historical mode · Test set metrics · CNN v1</span>
        </div>
      </footer>
    </div>
  )
}
