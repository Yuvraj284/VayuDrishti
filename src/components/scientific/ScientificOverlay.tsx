import './ScientificOverlay.css'

/**
 * Minimal atmospheric annotation layer.
 * Only shows what earns its place — storm coordinates and name.
 * No HUD decorations, no live clock, no telemetry rings.
 */
export default function ScientificOverlay() {
  return (
    <div className="sci-overlay" aria-hidden="true">
      {/* Storm identification — bottom left */}
      <div className="sci-overlay__id">
        <span className="sci-overlay__name">Phailin</span>
        <span className="sci-overlay__sub">Bay of Bengal · October 2013</span>
      </div>

      {/* Peak position — bottom right */}
      <div className="sci-overlay__coords">
        <span className="sci-overlay__coord-val">14.28°N</span>
        <span className="sci-overlay__coord-sep">·</span>
        <span className="sci-overlay__coord-val">87.64°E</span>
      </div>
    </div>
  )
}
