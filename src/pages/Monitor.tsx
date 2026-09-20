import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type * as Leaflet from 'leaflet'
import Nav from '../components/layout/Nav'
import { ktColor } from '../components/data/TrackPlot'
import { STORMS, fixLabel, intensityLabel, peakKt, strength, type Storm } from '../data/storms'
import { THRESHOLD } from '../data/model'
import { INSPECT_KEYS } from '../three/cameraPresets'
import { EASE, reveal, stagger } from '../motion'
import './Monitor.css'

const StormCanvas = lazy(() => import('../three/StormCanvas'))

type LeafletNS = typeof import('leaflet')

export default function Monitor() {
  const [selected, setSelected] = useState<Storm>(STORMS[0])
  const [fix, setFix] = useState<number | null>(null)

  const mapHostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const leafletRef = useRef<LeafletNS | null>(null)
  const trackGroupRef = useRef<Leaflet.LayerGroup | null>(null)
  const fixMarkerRef = useRef<Leaflet.CircleMarker | null>(null)

  /* ── Draw one storm's best track ─────────────────────────────────────── */
  const drawStorm = useCallback((L: LeafletNS, map: Leaflet.Map, storm: Storm) => {
    trackGroupRef.current?.remove()
    fixMarkerRef.current = null

    const group = L.layerGroup().addTo(map)
    trackGroupRef.current = group

    const latlngs = storm.track.map(([lat, lon]) => [lat, lon] as [number, number])

    // Dashed guide through every fix, under the intensity-coded segments.
    L.polyline(latlngs, {
      color: 'rgba(180, 214, 234, 0.26)',
      weight: 1,
      dashArray: '3 6',
      interactive: false,
    }).addTo(group)

    for (let i = 0; i < storm.track.length - 1; i++) {
      const [lat1, lon1, kt1] = storm.track[i]
      const [lat2, lon2, kt2] = storm.track[i + 1]
      const avg = (kt1 + kt2) / 2
      L.polyline(
        [
          [lat1, lon1],
          [lat2, lon2],
        ] as [number, number][],
        {
          color: ktColor(avg),
          weight: 1.5 + (avg / 120) * 4,
          opacity: 0.9,
          lineCap: 'round',
          interactive: false,
        },
      ).addTo(group)
    }

    storm.track.forEach(([lat, lon, kt], i) => {
      const marker = L.circleMarker([lat, lon], {
        radius: 3.5 + (kt / 120) * 4,
        fillColor: ktColor(kt),
        fillOpacity: 0.92,
        color: 'rgba(255, 255, 255, 0.34)',
        weight: i === storm.track.length - 1 ? 1.4 : 0.6,
      })
      marker.bindTooltip(
        `<b>${storm.name}</b><br/>${fixLabel(storm, i)}<br/>${kt} kt · ${lat.toFixed(1)}°N ${lon.toFixed(1)}°E`,
        { className: 'storm-tip', direction: 'top', offset: [0, -6] },
      )
      marker.on('mouseover', () => setFix(i))
      marker.addTo(group)
    })

    if (storm.landfall) {
      const [lfLat, lfLon] = storm.landfall
      const icon = L.divIcon({
        html: '<span class="landfall__ring"></span><span class="landfall__dot"></span>',
        className: 'landfall',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })
      L.marker([lfLat, lfLon], { icon })
        .bindTooltip(`<b>Landfall</b><br/>${storm.name}`, {
          className: 'storm-tip',
          direction: 'top',
          offset: [0, -12],
        })
        .addTo(group)
    }

    map.fitBounds(L.latLngBounds(latlngs), { padding: [70, 70], maxZoom: 6 })
  }, [])

  /* ── Map lifecycle ───────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const mod = await import('leaflet')
      await import('leaflet/dist/leaflet.css')
      const L = (mod.default ?? mod) as LeafletNS
      if (cancelled || !mapHostRef.current || mapRef.current) return

      leafletRef.current = L

      const map = L.map(mapHostRef.current, {
        center: [15, 82],
        zoom: 5,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: true,
        worldCopyJump: false,
      })
      mapRef.current = map

      L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
        attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap',
        maxZoom: 18,
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map)

      drawStorm(L, map, STORMS[0])
    }

    init()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      trackGroupRef.current = null
    }
  }, [drawStorm])

  // Redraw on selection change.
  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    if (!L || !map) return
    setFix(null)
    drawStorm(L, map, selected)
  }, [selected, drawStorm])

  // Highlight the scrubbed fix.
  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    const group = trackGroupRef.current
    if (!L || !map || !group) return

    fixMarkerRef.current?.remove()
    fixMarkerRef.current = null
    if (fix == null) return

    const [lat, lon] = selected.track[fix]
    const halo = L.circleMarker([lat, lon], {
      radius: 13,
      fill: false,
      color: '#5ecfe0',
      weight: 1.2,
      opacity: 0.85,
      interactive: false,
    })
    halo.addTo(group)
    fixMarkerRef.current = halo
  }, [fix, selected])

  const activeFix = fix == null ? null : selected.track[fix]
  const peak = useMemo(() => peakKt(selected), [selected])

  return (
    <div className="monitor route-fade">
      <Nav />

      <div className="monitor__grid">
        {/* ── Map ── */}
        <div className="monitor__map" id="monitor-map">
          <div ref={mapHostRef} className="monitor__map-el" />

          <div className="monitor__map-head">
            <span className="label">North Indian Ocean · best track</span>
            <span className="monitor__map-coords readout">
              {activeFix
                ? `${activeFix[0].toFixed(1)}°N  ${activeFix[1].toFixed(1)}°E  ·  ${activeFix[2]} kt`
                : `${selected.track.length} fixes · peak ${peak} kt`}
            </span>
          </div>

          <div className="monitor__legend">
            {[34, 48, 64, 83, 96, 113].map((kt, i, arr) => (
              <span className="monitor__legend-item" key={kt}>
                <span className="monitor__legend-swatch" style={{ background: ktColor(kt + 1) }} />
                {i === arr.length - 1 ? `${kt}+` : kt}
              </span>
            ))}
            <span className="monitor__legend-unit">kt</span>
          </div>
        </div>

        {/* ── Dossier ── */}
        <motion.aside
          className="dock"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.header className="dock__head" variants={reveal} custom={0.05}>
            <div>
              <span className="label">Storm archive</span>
              <h1 className="dock__title heading">Monitor</h1>
            </div>
            <span className="pill pill--live">
              <span className="pill__dot" />
              Historical
            </span>
          </motion.header>

          {/* Selected system */}
          <motion.section
            className="dock__storm"
            variants={reveal}
            custom={0.14}
            key={selected.id}
          >
            <div className="dock__storm-id">
              <h2 className="dock__name display">{selected.name}</h2>
              <span className="dock__code label">{selected.id}</span>
            </div>
            <p className="dock__meta label">
              {selected.basin} · {selected.dates[0]} — {selected.dates[1]}
            </p>

            {/* 3D structure inset, scaled to this storm's real intensity */}
            <div className="dock__structure">
              <Suspense fallback={<div className="dock__structure-poster" />}>
                <StormCanvas
                  cameraKeys={INSPECT_KEYS}
                  intensity={strength(selected)}
                  densityScale={0.46}
                  showOcean={false}
                  orbit={0.05}
                />
              </Suspense>
              <span className="dock__structure-cap label">
                Structure at peak · {intensityLabel(selected.cat)}
              </span>
            </div>

            <div className="dock__vitals">
              <div className="dock__vital">
                <span className="dock__vital-value readout">{selected.vmax}</span>
                <span className="label">peak wind</span>
              </div>
              <div className="dock__vital">
                <span className="dock__vital-value readout">{selected.mslp}</span>
                <span className="label">min pressure</span>
              </div>
            </div>

            <div className="kv">
              <span className="kv__k">Category</span>
              <span className="kv__v">{intensityLabel(selected.cat)}</span>
            </div>
            <div className="kv">
              <span className="kv__k">Outcome</span>
              <span className="kv__v">{selected.status}</span>
            </div>

            <p className="dock__summary">{selected.summary}</p>

            {/* Track scrubber */}
            <div className="scrub">
              <div className="scrub__head">
                <span className="label">Best-track fixes</span>
                <span className="scrub__stamp readout">
                  {fix == null ? '—' : fixLabel(selected, fix)}
                </span>
              </div>
              <div className="scrub__bars" onMouseLeave={() => setFix(null)}>
                {selected.track.map(([, , kt], i) => (
                  <button
                    key={i}
                    className={`scrub__bar ${fix === i ? 'scrub__bar--on' : ''}`}
                    style={{
                      height: `${18 + (kt / 120) * 42}px`,
                      background: ktColor(kt),
                    }}
                    onMouseEnter={() => setFix(i)}
                    onFocus={() => setFix(i)}
                    onClick={() => setFix(i)}
                    aria-label={`Fix ${i}: ${kt} knots`}
                  />
                ))}
              </div>
              <div className="scrub__axis">
                <span className="label">{selected.dates[0]}</span>
                <span className="label">{selected.dates[1]}</span>
              </div>
            </div>

            {/* Model verdict */}
            <div className="verdict">
              <div className="verdict__head">
                <span className="label">VayuDrishti CNN v1</span>
                <span className="verdict__value readout">{selected.prob.toFixed(3)}</span>
              </div>
              <div className="verdict__track">
                <motion.span
                  className="verdict__fill"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: selected.prob }}
                  transition={{ duration: 1, ease: EASE }}
                />
                <span className="verdict__threshold" style={{ left: `${THRESHOLD * 100}%` }} />
              </div>
              <div className="verdict__foot">
                <span className="label">P(cyclone) · threshold {THRESHOLD}</span>
                <span className="verdict__class">
                  {selected.prob >= THRESHOLD ? 'Cyclone' : 'Non-cyclone'}
                </span>
              </div>
            </div>
          </motion.section>

          {/* Index */}
          <motion.section className="index" variants={reveal} custom={0.24}>
            <span className="label index__title">Historical systems</span>
            {STORMS.map((s) => {
              const on = s.id === selected.id
              return (
                <button
                  key={s.id}
                  className={`index__row ${on ? 'index__row--on' : ''}`}
                  onClick={() => setSelected(s)}
                >
                  <span className="index__year readout">{s.year}</span>
                  <span className="index__name">{s.name}</span>
                  <span className="index__basin label">
                    {s.basin === 'Bay of Bengal' ? 'BoB' : 'ARB'}
                  </span>
                  <span className="index__kt readout" style={{ color: ktColor(peakKt(s)) }}>
                    {peakKt(s)} kt
                  </span>
                </button>
              )
            })}
          </motion.section>
        </motion.aside>
      </div>
    </div>
  )
}
