import { STORMS, intensityLabel, peakKt, type Storm } from '../data/storms'
import { THRESHOLD } from '../data/model'
import {
  CATEGORY_RANK,
  SEVERITY_RANK,
  type AlertCriteria,
  type AlertRecord,
  type AlertSeverity,
} from './types'

/* ───────────────────────────────────────────────────────────────
   DERIVING RECORDS FROM THE ARCHIVE

   These are replays of what the locked CNN v1 reports for systems
   that have already happened. They are generated from the same
   best-track data the maps and charts use, and every one is stamped
   `archival: true`.

   No official bulletins are produced here. VayuDrishti has no
   authority feed attached, and synthesising one would be both
   dishonest and unsafe — the panel shows an explicit empty state
   instead.
   ─────────────────────────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Parses the archive's "04 Oct 2013" window labels into a UTC timestamp. */
function parseArchiveDate(label: string): Date {
  const [day, mon, year] = label.split(' ')
  const month = Math.max(0, MONTHS.indexOf(mon))
  return new Date(Date.UTC(Number(year), month, Number(day), 0, 0, 0))
}

/** Best-track fixes are six-hourly from the start of the window. */
function fixTime(storm: Storm, index: number): Date {
  const start = parseArchiveDate(storm.dates[0])
  return new Date(start.getTime() + index * 6 * 3600 * 1000)
}

function severityFor(storm: Storm): AlertSeverity {
  switch (storm.cat) {
    case 'ESCS':
    case 'VSCS':
      return 'warning'
    case 'SCS':
      return 'watch'
    default:
      return 'advisory'
  }
}

/** Index of the first fix at the storm's peak intensity. */
function peakIndex(storm: Storm): number {
  const peak = peakKt(storm)
  return Math.max(0, storm.track.findIndex(([, , kt]) => kt === peak))
}

/**
 * One detection record per archived system, timestamped at the fix where the
 * storm reached its peak — the observation the headline figures describe.
 */
export function buildArchiveRecords(storms: Storm[] = STORMS): AlertRecord[] {
  return storms
    .map((storm) => {
      const idx = peakIndex(storm)
      const observed = fixTime(storm, idx)
      const [lat, lon, kt] = storm.track[idx]

      return {
        id: `detection-${storm.id}`,
        kind: 'detection' as const,
        severity: severityFor(storm),

        stormId: storm.id,
        stormName: storm.name,
        basin: storm.basin,
        category: storm.cat,
        categoryLabel: intensityLabel(storm.cat),
        vmaxKt: kt,

        probability: storm.prob,
        threshold: THRESHOLD,

        source: 'VayuDrishti CNN v1',
        observedAt: observed.toISOString(),
        // Deliberately omitted: an archive replay has no inference timestamp
        // that could be reported honestly.
        predictedAt: undefined,
        issuedAt: observed.toISOString(),

        archival: true,

        headline: `${storm.name} classified as cyclonic`,
        detail:
          `${storm.basin} · ${intensityLabel(storm.cat)} · ${kt} kt at ` +
          `${lat.toFixed(1)}°N ${lon.toFixed(1)}°E. ` +
          `P(cyclone) ${storm.prob.toFixed(3)} against a ${THRESHOLD} threshold.`,
      }
    })
    .sort((a, b) => {
      const s = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
      return s !== 0 ? s : b.observedAt.localeCompare(a.observedAt)
    })
}

/** Does one record satisfy the user's criteria? */
export function matches(record: AlertRecord, criteria: AlertCriteria): boolean {
  if (!criteria.basins.includes(record.basin)) return false

  if (criteria.minCategory !== 'any') {
    if (CATEGORY_RANK[record.category] < CATEGORY_RANK[criteria.minCategory]) return false
  }

  if (record.kind === 'detection') {
    if (!criteria.onDetection) return false
    if (record.probability != null && record.probability < criteria.minProbability) return false
    return true
  }

  return criteria.includeOfficial
}

export function selectRecords(records: AlertRecord[], criteria: AlertCriteria): AlertRecord[] {
  return records.filter((r) => matches(r, criteria))
}

/** Formats an ISO timestamp as a compact UTC stamp for the readouts. */
export function formatStamp(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const mon = MONTHS[d.getUTCMonth()]
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${day} ${mon} ${d.getUTCFullYear()} · ${hh}${mm}Z`
}
