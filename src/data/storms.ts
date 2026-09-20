/* ───────────────────────────────────────────────────────────────
   STORM ARCHIVE
   Historical North Indian Ocean cyclones, 2012–2017.
   Tracks are approximate IBTrACS best-track positions:
   [latitude, longitude, intensity_kt].
   Values preserved from the original Monitor dataset.
   ─────────────────────────────────────────────────────────────── */

export interface Storm {
  id: string
  name: string
  basin: 'Bay of Bengal' | 'Arabian Sea'
  year: number
  cat: StormCategory
  vmax: string
  mslp: string
  /** VayuDrishti CNN v1 — P(cyclone) for this system */
  prob: number
  status: 'Landfall' | 'Dissipated'
  /** [lat, lon, kt] */
  track: [number, number, number][]
  landfall: [number, number] | null
  /** Editorial one-liner used by the dossier views */
  summary: string
  /** Best-track window, for the timeline scrubber */
  dates: [string, string]
}

export type StormCategory = 'ESCS' | 'VSCS' | 'SCS' | 'CS' | 'TD'

export const STORMS: Storm[] = [
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
      [14.5, 83.5, 85],
    ],
    landfall: [14.5, 83.5],
    summary:
      'Made landfall near Gopalpur, Odisha on 12 October 2013 — among the strongest tropical cyclones to strike the Indian subcontinent in two decades.',
    dates: ['04 Oct 2013', '14 Oct 2013'],
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
    summary:
      'Peaked over the open Arabian Sea in late October 2014, then sheared apart over cooler water before reaching the Gujarat coast.',
    dates: ['25 Oct 2014', '31 Oct 2014'],
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
      [15.8, 51.5, 90],
    ],
    landfall: [15.8, 51.5],
    summary:
      'The most intense cyclone on record to make landfall in Yemen, delivering several years of rainfall to the Gulf of Aden coast in a single day.',
    dates: ['28 Oct 2015', '04 Nov 2015'],
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
      [20.0, 87.5, 30],
    ],
    landfall: [20.0, 87.5],
    summary:
      'A weak but slow, moisture-laden system that tracked parallel to the east Indian coast before coming ashore near Chittagong.',
    dates: ['17 May 2016', '22 May 2016'],
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
    summary:
      'Formed unusually close to Sri Lanka and intensified rapidly while crossing the Lakshadweep Sea, catching fishing fleets offshore.',
    dates: ['29 Nov 2017', '06 Dec 2017'],
  },
]

/** IMD intensity classification — full names for the short codes. */
export const CATEGORY_LABEL: Record<StormCategory, string> = {
  ESCS: 'Extremely Severe',
  VSCS: 'Very Severe',
  SCS: 'Severe',
  CS: 'Cyclonic Storm',
  TD: 'Depression',
}

export function intensityLabel(cat: string): string {
  return CATEGORY_LABEL[cat as StormCategory] ?? cat
}

/** Peak intensity in knots, read off the best track. */
export function peakKt(storm: Storm): number {
  return storm.track.reduce((max, [, , kt]) => Math.max(max, kt), 0)
}

/**
 * Normalised storm strength in [0,1], mapped from the 35–120 kt range the
 * archive spans. Drives eyewall tightness and cloud density in the 3D view.
 */
export function strength(storm: Storm): number {
  return Math.max(0, Math.min(1, (peakKt(storm) - 35) / 85))
}

/**
 * Best-track fix labels. The archive stores positions without timestamps, so
 * fixes are labelled by their 6-hourly index from the start of the window.
 */
export function fixLabel(storm: Storm, index: number): string {
  const day = Math.floor(index / 4)
  const hour = (index % 4) * 6
  const startDay = storm.dates[0].split(' ')[0]
  const month = storm.dates[0].split(' ')[1]
  const d = parseInt(startDay, 10) + day
  return `${String(d).padStart(2, '0')} ${month} · ${String(hour).padStart(2, '0')}00Z`
}

/** Geographic extent of the archive, used to frame the basin overview. */
export const BASIN_BOUNDS = {
  west: 48,
  east: 96,
  south: 4,
  north: 26,
}
