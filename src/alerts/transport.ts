import type { AlertRecord, ChannelId } from './types'

/* ───────────────────────────────────────────────────────────────
   DELIVERY TRANSPORTS

   The panel renders whatever is in TRANSPORTS, so attaching real
   delivery later means implementing `deliver` and flipping `status`
   to 'active' — no UI work.

   Only the in-app feed is connected today. The rest are declared so
   the preference surface, the disabled states and the copy already
   exist; they refuse rather than silently doing nothing, which keeps
   a half-finished integration from looking like a working one.
   ─────────────────────────────────────────────────────────────── */

export interface DeliveryResult {
  channel: ChannelId
  ok: boolean
  reason?: string
}

export interface AlertTransport {
  id: ChannelId
  label: string
  description: string
  status: 'active' | 'not-connected'
  /** Present only while `status` is 'not-connected'. */
  requires?: string
  deliver(record: AlertRecord): Promise<DeliveryResult>
}

const notConnected =
  (id: ChannelId, label: string, description: string, requires: string): AlertTransport => ({
    id,
    label,
    description,
    status: 'not-connected',
    requires,
    async deliver() {
      return { channel: id, ok: false, reason: `${label} delivery is not connected` }
    },
  })

export const TRANSPORTS: AlertTransport[] = [
  {
    id: 'in-app',
    label: 'In-app feed',
    description: 'Records appear in this panel while VayuDrishti is open.',
    status: 'active',
    async deliver(record) {
      // The feed is rendered straight from the evaluated records, so there is
      // nothing to push — delivery is complete once the record is selected.
      void record
      return { channel: 'in-app', ok: true }
    },
  },
  notConnected(
    'email',
    'Email',
    'A digest sent when a system crosses your criteria.',
    'an SES (or equivalent) sender and a verified address',
  ),
  notConnected(
    'push',
    'Browser push',
    'A notification even when the tab is closed.',
    'a service worker and VAPID keys',
  ),
  notConnected(
    'sms',
    'SMS',
    'A short message for warning-level systems only.',
    'an SNS (or equivalent) gateway and a verified number',
  ),
]

export const TRANSPORT_BY_ID = Object.fromEntries(
  TRANSPORTS.map((t) => [t.id, t]),
) as Record<ChannelId, AlertTransport>

/**
 * Fans a record out to every channel the user has switched on.
 *
 * Archive replays are never dispatched to an external channel: sending a
 * 2013 storm to someone's phone would present historical data as a live
 * alert, which the product must not do under any configuration.
 */
export async function dispatch(
  record: AlertRecord,
  channels: Record<ChannelId, boolean>,
): Promise<DeliveryResult[]> {
  const targets = TRANSPORTS.filter((t) => channels[t.id])

  return Promise.all(
    targets.map((t) => {
      if (record.archival && t.id !== 'in-app') {
        return Promise.resolve({
          channel: t.id,
          ok: false,
          reason: 'Archive replays are not delivered to external channels',
        })
      }
      return t.deliver(record)
    }),
  )
}
