import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/navigation/Navbar'
import './Monitor.css'

// ── Historical storm data ──────────────────────────────────────────────────
const STORMS = [
  {
    id: 'BOB-03-2013',
    name: 'Phailin',
    basin: 'Bay of Bengal',
    year: 2013,
    cat: 'ESCS',
    vmax: '115 kt',
    mslp: '940 hPa',
    prob: 0.967,
    status: 'Landfall',
    // IBTrACS approximate track — [lat, lon, intensity_kt]
    track: [
      [8.5, 94.0, 35],
      [9.2, 92.8, 45],
      [10.1, 91.5, 55],
      [10.8, 90.2, 70],
      [11.6, 89.0, 85],
      [12.4, 88.0, 100],
      [13.0, 87.2, 110],
      [13.8, 86.5, 115],
      [14.1, 85.8, 115],
      [14.3, 85.0, 110],
      [14.5, 84.2, 100],
      [14.5, 83.5, 85], // landfall
    ],
    landfall: [14.5, 83.5],
  },
  {
    id: 'ARB-04-2014',
    name: 'Nilofar',
    basin: 'Arabian Sea',
    year: 2014,
    cat: 'ESCS',
    vmax: '100 kt',
    mslp: '950 hPa',
    prob: 0.912,
    status: 'Dissipated',
    track: [
      [13.0, 65.0, 35],
      [14.5, 64.2, 55],
      [16.0, 63.5, 75],
      [17.5, 62.8, 90],
      [19.0, 62.2, 100],
      [20.5, 62.0, 95],
      [22.0, 62.5, 80],
      [23.5, 63.5, 60],
    ],
    landfall: null,
  },
  {
    id: 'ARB-02-2015',
    name: 'Chapala',
    basin: 'Arabian Sea',
    year: 2015,
    cat: 'VSCS',
    vmax: '120 kt',
    mslp: '940 hPa',
    prob: 0.943,
    status: 'Landfall',
    track: [
      [11.5, 60.0, 35],
      [12.0, 58.5, 55],
      [12.8, 57.2, 80],
      [13.5, 56.0, 100],
      [14.0, 54.5, 115],
      [14.5, 53.5, 120],
      [15.2, 52.5, 110],
      [15.8, 51.5, 90],  // Yemen landfall
    ],
    landfall: [15.8, 51.5],
  },
  {
    id: 'BOB-01-2016',
    name: 'Roanu',
    basin: 'Bay of Bengal',
    year: 2016,
    cat: 'CS',
    vmax: '45 kt',
    mslp: '983 hPa',
    prob: 0.781,
    status: 'Landfall',
    track: [
      [6.0, 83.0, 30],
      [7.5, 83.5, 35],
      [9.5, 83.8, 38],
      [11.5, 84.2, 42],
      [13.0, 84.8, 45],
      [15.0, 85.5, 45],
      [17.0, 86.2, 40],
      [19.0, 87.0, 35],
      [20.0, 87.5, 30],  // Bangladesh landfall
    ],
    landfall: [20.0, 87.5],
  },
  {
    id: 'ARB-05-2017',
    name: 'Ockhi',
    basin: 'Arabian Sea',
    year: 2017,
    cat: 'VSCS',
    vmax: '85 kt',
    mslp: '976 hPa',
    prob: 0.889,
    status: 'Dissipated',
    track: [
      [7.5, 80.0, 35],
      [7.8, 78.5, 50],
      [8.5, 76.8, 65],
      [9.5, 74.5, 75],
      [10.5, 72.0, 80],
      [12.0, 69.5, 85],
      [14.0, 67.0, 75],
      [16.0, 65.5, 60],
    ],
    landfall: null,
  },
]

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: (d: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: d, ease: [0.16, 1, 0.3, 1] },
  }),
}

type Storm = typeof STORMS[0]

export default function Monitor() {
  const [selected, setSelected] = useState<Storm>(STORMS[0])
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const trackLayerRef = useRef<unknown>(null)
  const markersRef = useRef<unknown[]>([])

  useEffect(() => {
    // Dynamic import of Leaflet to avoid SSR issues
    let L: typeof import('leaflet')
    let map: ReturnType<typeof import('leaflet').map>

    const initMap = async () => {
      const leaflet = await import('leaflet')
      L = leaflet.default ?? leaflet

      if (!mapRef.current || mapInstanceRef.current) return

      // Fix Leaflet default marker icon path issue with bundlers
      delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      map = L.map(mapRef.current, {
        center: [15, 82],
        zoom: 5,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: true,
      })

      mapInstanceRef.current = map

      // OpenStreetMap — free, no API key needed
      // Using dark-styled tiles from Stadia Maps (free tier, no key for localhost)
      L.tileLayer(
        'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
        {
          attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap',
          maxZoom: 20,
        }
      ).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Draw initial storm
      drawStorm(L, map, selected)
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        ;(mapInstanceRef.current as { remove: () => void }).remove()
        mapInstanceRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redraw when selected storm changes
  useEffect(() => {
    const updateMap = async () => {
      if (!mapInstanceRef.current) return
      const leaflet = await import('leaflet')
      const L = leaflet.default ?? leaflet
      const map = mapInstanceRef.current as ReturnType<typeof import('leaflet').map>
      drawStorm(L, map, selected)
    }
    updateMap()
  }, [selected])

  const drawStorm = (
    L: typeof import('leaflet'),
    map: ReturnType<typeof import('leaflet').map>,
    storm: Storm
  ) => {
    // Clear previous layers
    if (trackLayerRef.current) {
      (trackLayerRef.current as { remove: () => void }).remove()
    }
    markersRef.current.forEach((m) => (m as { remove: () => void }).remove())
    markersRef.current = []

    const group = L.layerGroup().addTo(map)
    trackLayerRef.current = group

    // ── Track line — dashed polyline with intensity encoding ──
    const latlngs = storm.track.map(([lat, lon]) => [lat, lon] as [number, number])

    // Main track — slightly transparent
    L.polyline(latlngs, {
      color: 'rgba(138, 180, 200, 0.25)',
      weight: 1.5,
      dashArray: '4 6',
    }).addTo(group)

    // Intensity segments — thicker for stronger winds
    for (let i = 0; i < storm.track.length - 1; i++) {
      const [lat1, lon1, kt1] = storm.track[i]
      const [lat2, lon2, kt2] = storm.track[i + 1]
      const avgKt = (kt1 + kt2) / 2
      const t = Math.max(0, Math.min(1, (avgKt - 35) / 90))
      const r = Math.round(138 + t * 82)
      const g = Math.round(180 - t * 60)
      const b = Math.round(200 - t * 30)
      const alpha = 0.5 + t * 0.4

      L.polyline([[lat1, lon1], [lat2, lon2]] as [number, number][], {
        color: `rgba(${r},${g},${b},${alpha})`,
        weight: 1.5 + t * 3.5,
      }).addTo(group)
    }

    // ── Track position markers ──
    storm.track.forEach(([lat, lon, kt], i) => {
      const t = Math.max(0, Math.min(1, (kt - 35) / 90))
      const r = Math.round(4 + t * 5)
      const isLast = i === storm.track.length - 1

      const circle = L.circleMarker([lat, lon], {
        radius: isLast ? r + 1 : r,
        fillColor: `rgba(${Math.round(138 + t * 82)}, ${Math.round(180 - t * 60)}, ${Math.round(200 - t * 30)}, 1)`,
        fillOpacity: isLast ? 0.95 : 0.6 + t * 0.3,
        color: 'rgba(255,255,255,0.3)',
        weight: isLast ? 1.5 : 0.5,
      })

      const date = i < 3 ? `Oct ${4 + i * 2}` : `Oct ${10 + (i - 3)}`
      circle.bindTooltip(
        `<div class="storm-tooltip"><b>${storm.name}</b><br/>${date} · ${kt} kt</div>`,
        { className: 'storm-tooltip-container', direction: 'top', offset: [0, -6] }
      )
      circle.addTo(group)
      markersRef.current.push(circle)
    })

    // ── Landfall marker ──
    if (storm.landfall) {
      const [lfLat, lfLon] = storm.landfall
      const landfallIcon = L.divIcon({
        html: `<div class="landfall-marker"><div class="landfall-marker__ring"></div><div class="landfall-marker__dot"></div></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        className: '',
      })
      const lm = L.marker([lfLat, lfLon], { icon: landfallIcon })
      lm.bindTooltip(`<div class="storm-tooltip"><b>Landfall</b><br/>${storm.name}</div>`, {
        className: 'storm-tooltip-container',
        direction: 'top',
        offset: [0, -12],
      })
      lm.addTo(group)
      markersRef.current.push(lm)
    }

    // ── Fit map to track ──
    map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 6 })
  }

  // Intensity label mapping
  const intensityLabel = (cat: string) => {
    const map: Record<string, string> = {
      'ESCS': 'Extremely Severe',
      'VSCS': 'Very Severe',
      'SCS':  'Severe',
      'CS':   'Cyclonic Storm',
      'TD':   'Depression',
    }
    return map[cat] ?? cat
  }

  return (
    <div className="monitor">
      <Navbar />

      <div className="monitor__layout">
        {/* ── Map ── */}
        <div className="monitor__map-wrap" id="monitor-map">
          <div ref={mapRef} className="monitor__map-el" />
        </div>

        {/* ── Intelligence panel ── */}
        <motion.aside
          className="monitor__panel"
          initial="hidden"
          animate="visible"
        >
          {/* Panel header */}
          <motion.div className="panel__header" variants={reveal} custom={0.1}>
            <h2 className="panel__title">Storm archive</h2>
            <span className="panel__tag">Historical</span>
          </motion.div>

          {/* Storm details */}
          <motion.div className="panel__storm" variants={reveal} custom={0.2} key={selected.id}>
            <div className="panel__storm-name">{selected.name}</div>
            <div className="panel__storm-meta">
              {selected.basin} · {selected.year}
            </div>

            <div className="panel__divider" />

            <div className="panel__stats">
              <div className="stat">
                <span className="stat__value">{selected.vmax}</span>
                <span className="stat__label">peak wind</span>
              </div>
              <div className="stat">
                <span className="stat__value">{selected.mslp}</span>
                <span className="stat__label">min pressure</span>
              </div>
            </div>

            <div className="panel__row">
              <span className="panel__row-label">Category</span>
              <span className="panel__row-value">{intensityLabel(selected.cat)}</span>
            </div>
            <div className="panel__row">
              <span className="panel__row-label">Status</span>
              <span className="panel__row-value">{selected.status}</span>
            </div>

            <div className="panel__divider" />

            {/* Model prediction */}
            <div className="panel__prediction">
              <div className="panel__pred-header">
                <span className="panel__pred-label">VayuDrishti CNN v1</span>
                <span className="panel__pred-value">{selected.prob.toFixed(3)}</span>
              </div>
              <div className="panel__pred-bar">
                <div
                  className="panel__pred-fill"
                  style={{ width: `${selected.prob * 100}%` }}
                />
                <div className="panel__pred-threshold" />
              </div>
              <div className="panel__pred-foot">
                <span>P(cyclone) · threshold 0.57</span>
                <span className="panel__pred-class">CYCLONE</span>
              </div>
            </div>
          </motion.div>

          {/* Storm selector */}
          <motion.div className="panel__list" variants={reveal} custom={0.3}>
            <div className="panel__list-title">Historical systems</div>
            {STORMS.map((s) => (
              <button
                key={s.id}
                className={`panel__storm-btn ${selected.id === s.id ? 'panel__storm-btn--active' : ''}`}
                onClick={() => setSelected(s)}
              >
                <span className="panel__storm-btn-name">{s.name}</span>
                <span className="panel__storm-btn-meta">{s.year} · {s.cat}</span>
              </button>
            ))}
          </motion.div>
        </motion.aside>
      </div>
    </div>
  )
}
