import type { Storm, StormCategory } from '../data/storms'

/* ───────────────────────────────────────────────────────────────
   ALERT MODEL

   Two things are kept strictly apart throughout:

     detection — VayuDrishti's own CNN saying "this looks cyclonic".
                 It is a model output, not a warning, and carries a
                 probability and the model version that produced it.

     official  — a bulletin from a meteorological authority (IMD and
                 the other RSMCs). VayuDrishti does not issue these
                 and never synthesises them; the type exists so a real
                 feed can be attached without reshaping the UI.

   Every record also carries `archival`. The product currently runs on
   the 2012–2017 historical archive, so every record it can produce
   today is a replay. Nothing in the UI may present one as live.
   ─────────────────────────────────────────────────────────────── */

export type Basin = Storm['basin']

export type AlertKind = 'detection' | 'official'

export type AlertSeverity = 'advisory' | 'watch' | 'warning'

export type ChannelId = 'in-app' | 'email' | 'push' | 'sms'

export interface AlertCriteria {
  /** Raise a record whenever the classifier flags a system. */
  onDetection: boolean
  /** Minimum P(cyclone) for a detection to qualify, 0–1. */
  minProbability: number
  /** Minimum IMD intensity class, or 'any'. */
  minCategory: StormCategory | 'any'
  /** Basins to watch. An empty list matches nothing. */
  basins: Basin[]
  /** Include official bulletins when a feed is connected. */
  includeOfficial: boolean
}

export interface AlertPreferences {
  enabled: boolean
  criteria: AlertCriteria
  channels: Record<ChannelId, boolean>
}

export interface AlertRecord {
  id: string
  kind: AlertKind
  severity: AlertSeverity

  stormId: string
  stormName: string
  basin: Basin
  category: StormCategory
  categoryLabel: string
  vmaxKt: number

  /** Present for detections only. */
  probability?: number
  /** Threshold the probability was judged against. */
  threshold?: number

  /** Who produced this record. */
  source: string
  /** Time of the observation the record is based on. ISO 8601. */
  observedAt: string
  /**
   * When the model that produced this record was run. Absent for archive
   * replays — there is no inference timestamp to honestly report.
   */
  predictedAt?: string
  /** When the record entered the feed. ISO 8601. */
  issuedAt: string

  /** True whenever the record is replayed from the historical archive. */
  archival: boolean

  headline: string
  detail: string
}

/** Ordering used by the minimum-category filter. */
export const CATEGORY_RANK: Record<StormCategory, number> = {
  TD: 0,
  CS: 1,
  SCS: 2,
  VSCS: 3,
  ESCS: 4,
}

export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  advisory: 0,
  watch: 1,
  warning: 2,
}

export const DEFAULT_PREFERENCES: AlertPreferences = {
  enabled: false,
  criteria: {
    onDetection: true,
    // Defaults to the model's own locked decision threshold.
    minProbability: 0.57,
    minCategory: 'CS',
    basins: ['Bay of Bengal', 'Arabian Sea'],
    includeOfficial: true,
  },
  channels: {
    'in-app': true,
    email: false,
    push: false,
    sms: false,
  },
}

/** How current a record is, described in terms the record can support. */
export interface Freshness {
  label: string
  /** `archive` never renders as a live-data tone. */
  tone: 'archive' | 'fresh' | 'ageing' | 'stale'
  detail: string
}

export function describeFreshness(record: AlertRecord, now = Date.now()): Freshness {
  if (record.archival) {
    const observed = new Date(record.observedAt)
    return {
      tone: 'archive',
      label: 'Archive',
      detail: `Best-track record from ${observed.getUTCFullYear()} — not live data`,
    }
  }

  const age = now - new Date(record.observedAt).getTime()
  const minutes = Math.round(age / 60000)
  if (minutes < 90) return { tone: 'fresh', label: `${minutes} min old`, detail: 'Current' }
  const hours = Math.round(minutes / 60)
  if (hours < 12) return { tone: 'ageing', label: `${hours} h old`, detail: 'Ageing' }
  return { tone: 'stale', label: `${hours} h old`, detail: 'Stale — check the source feed' }
}
