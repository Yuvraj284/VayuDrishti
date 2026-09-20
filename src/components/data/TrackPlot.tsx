import { useMemo } from 'react'
import { COASTLINES, INDIA_LANDMASS, ARABIA_LANDMASS, REFERENCE_POINTS } from '../../data/geography'
import type { Storm } from '../../data/storms'
import './TrackPlot.css'

/* Equirectangular projection over the North Indian Ocean. At this extent the
   distortion from ignoring the cosine term is under 4%, well below the
   generalisation already in the coastline. */

const WEST = 44
const EAST = 98
const SOUTH = 3
const NORTH = 27

const W = 1080
const H = (W * (NORTH - SOUTH)) / (EAST - WEST)

const x = (lon: number) => ((lon - WEST) / (EAST - WEST)) * W
const y = (lat: number) => H - ((lat - SOUTH) / (NORTH - SOUTH)) * H

/** Saffir–Simpson-adjacent ramp: cool at depression strength, hot at peak. */
export function ktColor(kt: number): string {
  if (kt < 34) return '#6f9fc4'
  if (kt < 48) return '#7fc2d4'
  if (kt < 64) return '#86d2c4'
  if (kt < 83) return '#d8c274'
  if (kt < 96) return '#e0a066'
  if (kt < 113) return '#e4835c'
  return '#e4685c'
}

function toPath(pts: [number, number][], closed: boolean): string {
  if (!pts.length) return ''
  const d = pts.map(([lon, lat], i) => `${i ? 'L' : 'M'}${x(lon).toFixed(1)} ${y(lat).toFixed(1)}`).join(' ')
  return closed ? `${d} Z` : d
}

interface TrackPlotProps {
  storms: Storm[]
  /** Storm drawn at full strength; the rest recede. */
  activeId?: string
  onSelect?: (id: string) => void
  showReferencePoints?: boolean
  className?: string
}

export default function TrackPlot({
  storms,
  activeId,
  onSelect,
  showReferencePoints = true,
  className,
}: TrackPlotProps) {
  const land = useMemo(
    () => ({
      india: toPath(INDIA_LANDMASS, true),
      arabia: toPath(ARABIA_LANDMASS, true),
      coasts: COASTLINES.map((c) => toPath(c.path, c.closed)),
    }),
    [],
  )

  // Graticule every 10° of longitude, 5° of latitude.
  const graticule = useMemo(() => {
    const lons: number[] = []
    for (let l = Math.ceil(WEST / 10) * 10; l <= EAST; l += 10) lons.push(l)
    const lats: number[] = []
    for (let l = Math.ceil(SOUTH / 5) * 5; l <= NORTH; l += 5) lats.push(l)
    return { lons, lats }
  }, [])

  return (
    <div className={`track-plot ${className ?? ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="track-plot__svg" role="img"
        aria-label="Cyclone tracks over the North Indian Ocean">
        {/* Sea */}
        <rect width={W} height={H} fill="#04101d" />

        {/* Graticule */}
        <g className="track-plot__grid">
          {graticule.lons.map((lon) => (
            <line key={`lon${lon}`} x1={x(lon)} y1={0} x2={x(lon)} y2={H} />
          ))}
          {graticule.lats.map((lat) => (
            <line key={`lat${lat}`} x1={0} y1={y(lat)} x2={W} y2={y(lat)} />
          ))}
        </g>

        {/* Land */}
        <g className="track-plot__land">
          <path d={land.india} />
          <path d={land.arabia} />
        </g>
        <g className="track-plot__coast">
          {land.coasts.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* Graticule labels along the bottom and left edges */}
        <g className="track-plot__ticks">
          {graticule.lons.map((lon) => (
            <text key={`tl${lon}`} x={x(lon) + 4} y={H - 6}>{lon}°E</text>
          ))}
          {graticule.lats.map((lat) => (
            <text key={`ta${lat}`} x={5} y={y(lat) - 4}>{lat}°N</text>
          ))}
        </g>

        {/* Tracks */}
        {storms.map((storm) => {
          const active = !activeId || storm.id === activeId
          return (
            <g
              key={storm.id}
              className={`track-plot__track ${active ? '' : 'track-plot__track--dim'} ${onSelect ? 'track-plot__track--clickable' : ''}`}
              onClick={onSelect ? () => onSelect(storm.id) : undefined}
            >
              {/* Guide line through every fix */}
              <path
                className="track-plot__guide"
                d={toPath(storm.track.map(([lat, lon]) => [lon, lat]), false)}
              />

              {/* Intensity-coded segments */}
              {storm.track.slice(0, -1).map(([lat1, lon1, kt1], i) => {
                const [lat2, lon2, kt2] = storm.track[i + 1]
                const avg = (kt1 + kt2) / 2
                return (
                  <line
                    key={i}
                    x1={x(lon1)} y1={y(lat1)}
                    x2={x(lon2)} y2={y(lat2)}
                    stroke={ktColor(avg)}
                    strokeWidth={1.4 + (avg / 120) * 4}
                    strokeLinecap="round"
                    opacity={active ? 0.92 : 0.3}
                  />
                )
              })}

              {/* Six-hourly fixes */}
              {storm.track.map(([lat, lon, kt], i) => (
                <circle
                  key={i}
                  cx={x(lon)} cy={y(lat)}
                  r={2 + (kt / 120) * 3.2}
                  fill={ktColor(kt)}
                  opacity={active ? 0.95 : 0.32}
                />
              ))}

              {/* Landfall */}
              {storm.landfall && (
                <g className="track-plot__landfall" opacity={active ? 1 : 0.3}>
                  <circle cx={x(storm.landfall[1])} cy={y(storm.landfall[0])} r="10" />
                  <circle cx={x(storm.landfall[1])} cy={y(storm.landfall[0])} r="3.2" />
                </g>
              )}

              {/* Name at the origin of the track, pushed clear of the line.
                  The offset is perpendicular to the initial heading and forced
                  to point upward, so labels never sit on top of their track. */}
              {active && (() => {
                const [lat0, lon0] = storm.track[0]
                const [lat1, lon1] = storm.track[1]
                const dx = x(lon1) - x(lon0)
                const dy = y(lat1) - y(lat0)
                const len = Math.hypot(dx, dy) || 1
                let nx = -dy / len
                let ny = dx / len
                if (ny > 0) { nx = -nx; ny = -ny }
                let lx = x(lon0) + nx * 16
                const ly = y(lat0) + ny * 16

                // Keep the label inside the frame: flip its anchor when it
                // would run off an edge, then clamp what is left.
                const approxW = storm.name.length * 11 + 44
                let anchor: 'start' | 'middle' | 'end' =
                  nx < -0.25 ? 'end' : nx > 0.25 ? 'start' : 'middle'
                if (anchor === 'start' && lx + approxW > W - 8) anchor = 'end'
                else if (anchor === 'end' && lx - approxW < 8) anchor = 'start'

                if (anchor === 'start') lx = Math.min(lx, W - approxW - 8)
                else if (anchor === 'end') lx = Math.max(lx, approxW + 8)
                else lx = Math.min(Math.max(lx, approxW / 2 + 8), W - approxW / 2 - 8)

                return (
                  <>
                    <line
                      className="track-plot__leader"
                      x1={x(lon0)} y1={y(lat0)} x2={lx} y2={ly}
                    />
                    <text className="track-plot__name" x={lx} y={ly - 4} textAnchor={anchor}>
                      {storm.name}
                      <tspan className="track-plot__year" dx="7">{storm.year}</tspan>
                    </text>
                  </>
                )
              })()}
            </g>
          )
        })}

        {/* Coastal reference points */}
        {showReferencePoints && (
          <g className="track-plot__refs">
            {REFERENCE_POINTS.map((p) => (
              <g key={p.name}>
                <circle cx={x(p.lon)} cy={y(p.lat)} r="1.8" />
                <text x={x(p.lon) + 6} y={y(p.lat) - 5}>{p.name}</text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  )
}
