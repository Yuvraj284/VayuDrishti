import { useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/navigation/Navbar'
import './Predict.css'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (d: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: d, ease: [0.16, 1, 0.3, 1] },
  }),
}

// Mock input grid — 10 channels, showing a subset for visualization
const MOCK_CHANNELS = [
  'SST', 'MSLP', 'U850', 'V850', 'U200', 'V200', 'RH700', 'VORT850', 'OLR', 'TCWV',
]

export default function Predict() {
  const [probability, setProbability] = useState(0.923)
  const [isRunning, setIsRunning] = useState(false)
  const threshold = 0.57
  const isCyclone = probability >= threshold

  const handleInference = () => {
    setIsRunning(true)
    // Simulate inference delay
    setTimeout(() => {
      setProbability(0.85 + Math.random() * 0.12)
      setIsRunning(false)
    }, 1800)
  }

  return (
    <div className="predict-page">
      <Navbar />

      <div className="predict-layout">
        <motion.div
          className="predict-content"
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div className="predict-header" variants={fadeUp} custom={0.1}>
            <div>
              <h1 className="predict-header__title">Prediction Interface</h1>
              <p className="predict-header__subtitle">VayuDrishti CNN v1 · Binary Cyclone Classification</p>
            </div>
            <div className="predict-header__badges">
              <span className="predict-badge predict-badge--locked">MODEL LOCKED</span>
              <span className="predict-badge predict-badge--hist">HISTORICAL DATA</span>
            </div>
          </motion.div>

          <div className="predict-grid">
            {/* Input visualization */}
            <motion.div className="predict-input-card" variants={fadeUp} custom={0.2}>
              <div className="card-header">
                <span className="card-header__title">Input Tensor</span>
                <span className="card-header__meta">[10, 80, 80]</span>
              </div>

              <div className="channel-grid">
                {MOCK_CHANNELS.map((ch, i) => (
                  <div className="channel-tile" key={ch}>
                    <div className="channel-tile__vis">
                      {/* Procedural noise visualization for each channel */}
                      <svg viewBox="0 0 80 80" className="channel-tile__svg">
                        <defs>
                          <filter id={`noise-${i}`}>
                            <feTurbulence
                              type="fractalNoise"
                              baseFrequency={0.02 + i * 0.008}
                              numOctaves={3}
                              seed={i * 17 + 42}
                            />
                            <feColorMatrix
                              type="saturate"
                              values="0"
                            />
                          </filter>
                        </defs>
                        <rect width="80" height="80" filter={`url(#noise-${i})`} opacity="0.5" />
                      </svg>
                    </div>
                    <div className="channel-tile__info">
                      <span className="channel-tile__index">CH{i}</span>
                      <span className="channel-tile__name">{ch}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="predict-input-note">
                <span>Mock visualization · Actual channel mapping to be documented from training artifacts</span>
              </div>
            </motion.div>

            {/* Results */}
            <div className="predict-results">
              <motion.div className="predict-result-card" variants={fadeUp} custom={0.3}>
                <div className="card-header">
                  <span className="card-header__title">Inference Result</span>
                  <span className={`card-header__status ${isRunning ? 'card-header__status--running' : ''}`}>
                    {isRunning ? 'PROCESSING' : 'READY'}
                  </span>
                </div>

                {/* Big probability display */}
                <div className="prob-display">
                  <span className="prob-display__label">P(CYCLONE)</span>
                  <span className={`prob-display__value ${isCyclone ? 'prob-display__value--positive' : 'prob-display__value--negative'}`}>
                    {probability.toFixed(4)}
                  </span>
                  <span className={`prob-display__class ${isCyclone ? 'prob-display__class--positive' : 'prob-display__class--negative'}`}>
                    {isCyclone ? '● CYCLONE' : '○ NON-CYCLONE'}
                  </span>
                </div>

                {/* Threshold bar */}
                <div className="threshold-bar">
                  <div className="threshold-bar__labels">
                    <span>0.0</span>
                    <span>THRESHOLD: {threshold}</span>
                    <span>1.0</span>
                  </div>
                  <div className="threshold-bar__track">
                    <div className="threshold-bar__fill" style={{ width: `${probability * 100}%` }} />
                    <div className="threshold-bar__marker" style={{ left: `${threshold * 100}%` }} />
                    <div className="threshold-bar__needle" style={{ left: `${probability * 100}%` }} />
                  </div>
                  <div className="threshold-bar__zones">
                    <span>NON-CYCLONE</span>
                    <span>CYCLONE</span>
                  </div>
                </div>

                <button
                  className="predict-run-btn"
                  onClick={handleInference}
                  disabled={isRunning}
                  id="btn-run-inference"
                >
                  {isRunning ? 'RUNNING INFERENCE...' : 'RUN INFERENCE (MOCK)'}
                </button>
              </motion.div>

              {/* Model details */}
              <motion.div className="predict-detail-card" variants={fadeUp} custom={0.4}>
                <div className="card-header">
                  <span className="card-header__title">Model Configuration</span>
                </div>
                <div className="detail-rows">
                  {[
                    ['MODEL', 'VayuDrishti CNN v1'],
                    ['FRAMEWORK', 'PyTorch'],
                    ['ARCHITECTURE', '4-layer CNN'],
                    ['PARAMETERS', '317,665'],
                    ['INPUT SHAPE', '[10, 80, 80]'],
                    ['OUTPUT', 'Binary probability'],
                    ['THRESHOLD', '0.57'],
                    ['CHECKPOINT', 'checkpoint["model"]'],
                    ['TEST AUC', '0.9469'],
                    ['STATUS', 'LOCKED'],
                  ].map(([label, value]) => (
                    <div className="detail-row" key={label}>
                      <span className="detail-row__label">{label}</span>
                      <span className="detail-row__value">{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Architecture */}
              <motion.div className="predict-arch-card" variants={fadeUp} custom={0.5}>
                <div className="card-header">
                  <span className="card-header__title">Architecture</span>
                </div>
                <div className="arch-flow">
                  {[
                    'Conv2D(10→32) · BN · ReLU · MaxPool',
                    'Conv2D(32→64) · BN · ReLU · MaxPool',
                    'Conv2D(64→128) · BN · ReLU · MaxPool',
                    'Conv2D(128→192) · BN · ReLU',
                    'AdaptiveAvgPool2d(1)',
                    'Flatten · Dropout(0.30)',
                    'Linear(192→1)',
                  ].map((layer, i) => (
                    <div className="arch-layer" key={i}>
                      <span className="arch-layer__index">{i}</span>
                      <span className="arch-layer__desc">{layer}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
