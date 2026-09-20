import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertsContext, type AlertsValue } from './context'
import { buildArchiveRecords, selectRecords } from './evaluate'
import { DEFAULT_PREFERENCES, type AlertCriteria, type AlertPreferences, type ChannelId } from './types'

const STORAGE_KEY = 'vayudrishti.alerts.v1'

/** Preferences survive a reload; a private window or blocked storage must not break the app. */
function load(): AlertPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed = JSON.parse(raw) as Partial<AlertPreferences>
    return {
      enabled: parsed.enabled ?? DEFAULT_PREFERENCES.enabled,
      criteria: { ...DEFAULT_PREFERENCES.criteria, ...parsed.criteria },
      channels: { ...DEFAULT_PREFERENCES.channels, ...parsed.channels },
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

function save(prefs: AlertPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Storage unavailable — preferences simply do not persist this session.
  }
}

export default function AlertsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AlertPreferences>(load)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => save(prefs), [prefs])

  // The archive is static, so the candidate set is built once.
  const allRecords = useMemo(() => buildArchiveRecords(), [])

  const selected = useMemo(
    () => (prefs.enabled ? selectRecords(allRecords, prefs.criteria) : []),
    [allRecords, prefs.enabled, prefs.criteria],
  )

  const setEnabled = useCallback((on: boolean) => {
    setPrefs((p) => ({ ...p, enabled: on }))
  }, [])

  const setCriteria = useCallback((patch: Partial<AlertCriteria>) => {
    setPrefs((p) => ({ ...p, criteria: { ...p.criteria, ...patch } }))
  }, [])

  const setChannel = useCallback((id: ChannelId, on: boolean) => {
    setPrefs((p) => ({ ...p, channels: { ...p.channels, [id]: on } }))
  }, [])

  const reset = useCallback(() => setPrefs(DEFAULT_PREFERENCES), [])

  const value: AlertsValue = useMemo(
    () => ({
      prefs,
      allRecords,
      selected,
      setEnabled,
      setCriteria,
      setChannel,
      reset,
      panelOpen,
      setPanelOpen,
    }),
    [prefs, allRecords, selected, setEnabled, setCriteria, setChannel, reset, panelOpen],
  )

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
}
