/* ───────────────────────────────────────────────────────────────
   VAYUDRISHTI CNN v1 — MODEL FACTS
   The model itself is locked. These are the confirmed evaluation
   figures and the architecture description, carried over verbatim
   from the original Predict / Analytics pages.
   ─────────────────────────────────────────────────────────────── */

/**
 * Decision threshold.
 *
 * 0.51 is the F1-optimal operating point on the validation split, and is the
 * value stored inside the checkpoint itself, so the served model and this
 * constant agree. Selected on validation only -- see
 * s3://cyclone-12-09-2026/models/v1/evaluation/threshold_summary.json
 */
export const THRESHOLD = 0.51

/**
 * Confirmed test set metrics, evaluated at THRESHOLD on the held-out split.
 *
 * Every threshold-dependent figure below is tied to THRESHOLD = 0.51 and must
 * be recomputed if that value ever changes. AUC is threshold-free and holds
 * for any operating point.
 */
export const TEST_METRICS = {
  samples: 11149,
  auc: 0.9469,
  accuracy: 0.8671,
  precision: 0.8239,
  recall: 0.9338,
  f1: 0.8754,
  tn: 4460,
  fp: 1113,
  fn: 369,
  tp: 5207,
}

/**
 * Headline metrics in presentation order. The bar percentages are derived from
 * the values rather than restated, so the two can never disagree.
 */
export const HEADLINE_METRICS = [
  { label: 'AUC', value: TEST_METRICS.auc, pct: TEST_METRICS.auc * 100 },
  { label: 'Accuracy', value: TEST_METRICS.accuracy, pct: TEST_METRICS.accuracy * 100 },
  { label: 'Precision', value: TEST_METRICS.precision, pct: TEST_METRICS.precision * 100 },
  { label: 'Recall', value: TEST_METRICS.recall, pct: TEST_METRICS.recall * 100 },
  { label: 'F1', value: TEST_METRICS.f1, pct: TEST_METRICS.f1 * 100 },
]

/**
 * Year-wise performance. APPROXIMATE — the confirmed evaluation is the
 * pooled test set above; this per-year split is illustrative mock data.
 */
export const YEAR_DATA = [
  { year: 2012, accuracy: 0.862, auc: 0.938, samples: 1854 },
  { year: 2013, accuracy: 0.879, auc: 0.951, samples: 1892 },
  { year: 2014, accuracy: 0.871, auc: 0.945, samples: 1876 },
  { year: 2015, accuracy: 0.868, auc: 0.943, samples: 1834 },
  { year: 2016, accuracy: 0.875, auc: 0.949, samples: 1862 },
  { year: 2017, accuracy: 0.866, auc: 0.942, samples: 1831 },
]

/** Input tensor channels — [10, 80, 80]. */
export interface Channel {
  code: string
  name: string
  unit: string
  /** Colour ramp endpoints for the field preview. */
  ramp: [string, string]
}

/**
 * The ten channels the network was actually trained on, in the order recorded
 * in the checkpoint's `variables` list. This order is load-bearing: the network
 * cannot detect a permutation and would return a confident wrong answer, so the
 * inference service cross-checks it against the checkpoint before serving.
 *
 * Sources: TRMM (precipitation), CCMP (winds), GridSat-B1 (infrared, water
 * vapour and visible).
 */
export const CHANNELS: Channel[] = [
  { code: 'precipitation', name: 'Precipitation rate · TRMM', unit: 'mm h⁻¹', ramp: ['#0e2230', '#6fd3c0'] },
  { code: 'uwnd', name: 'Zonal wind · CCMP', unit: 'm s⁻¹', ramp: ['#102a3a', '#5ecfe0'] },
  { code: 'vwnd', name: 'Meridional wind · CCMP', unit: 'm s⁻¹', ramp: ['#132038', '#78c6d8'] },
  { code: 'ws', name: 'Wind speed · CCMP', unit: 'm s⁻¹', ramp: ['#161f3c', '#8fb6e0'] },
  { code: 'nobs', name: 'Observation count · CCMP', unit: 'count', ramp: ['#181d38', '#a3b8e4'] },
  { code: 'irwin_cdr', name: 'IR window brightness temperature', unit: 'K', ramp: ['#13243f', '#d8a06a'] },
  { code: 'irwin_2', name: 'IR window · second view', unit: 'K', ramp: ['#1a2036', '#e0a066'] },
  { code: 'irwvp', name: 'Water-vapour brightness temperature', unit: 'K', ramp: ['#0d1e38', '#9fd0e4'] },
  { code: 'irwvp_2', name: 'Water vapour · second view', unit: 'K', ramp: ['#0f2136', '#63b9d8'] },
  { code: 'vschn', name: 'Visible reflectance · GridSat', unit: 'reflectance', ramp: ['#0b1526', '#e2e8f2'] },
]

/** Channel codes alone, in model order. The single source of truth. */
export const CHANNEL_CODES = CHANNELS.map((c) => c.code)

/** Model configuration rows. */
export const MODEL_CONFIG: [string, string][] = [
  ['Model', 'VayuDrishti CNN v1'],
  ['Framework', 'PyTorch'],
  ['Architecture', '4-layer CNN'],
  ['Parameters', '317,665'],
  ['Input shape', '[10, 80, 80]'],
  ['Output', 'Binary probability'],
  ['Threshold', THRESHOLD.toFixed(2)],
  ['Checkpoint', 'checkpoint["model"]'],
  ['Test AUC', '0.9469'],
  ['Status', 'Locked'],
]

/** Forward pass, layer by layer. */
export const ARCHITECTURE = [
  'Conv2D(10→32) · BN · ReLU · MaxPool',
  'Conv2D(32→64) · BN · ReLU · MaxPool',
  'Conv2D(64→128) · BN · ReLU · MaxPool',
  'Conv2D(128→192) · BN · ReLU',
  'AdaptiveAvgPool2d(1)',
  'Flatten · Dropout(0.30)',
  'Linear(192→1)',
]

/** Spatial resolution of each layer's feature map, for the arch diagram. */
export const ARCH_SHAPES = [
  '32 × 40 × 40',
  '64 × 20 × 20',
  '128 × 10 × 10',
  '192 × 10 × 10',
  '192 × 1 × 1',
  '192',
  '1',
]
