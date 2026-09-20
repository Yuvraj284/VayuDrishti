import { createContext, useContext } from 'react'
import type { AlertCriteria, AlertPreferences, AlertRecord, ChannelId } from './types'

export interface AlertsValue {
  prefs: AlertPreferences
  /** Every record the archive can produce, before filtering. */
  allRecords: AlertRecord[]
  /** Records that satisfy the current criteria. Empty while alerts are off. */
  selected: AlertRecord[]
  setEnabled(on: boolean): void
  setCriteria(patch: Partial<AlertCriteria>): void
  setChannel(id: ChannelId, on: boolean): void
  reset(): void
  panelOpen: boolean
  setPanelOpen(open: boolean): void
}

export const AlertsContext = createContext<AlertsValue | null>(null)

export function useAlerts(): AlertsValue {
  const ctx = useContext(AlertsContext)
  if (!ctx) throw new Error('useAlerts must be used inside <AlertsProvider>')
  return ctx
}
