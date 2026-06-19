import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

import {
  getDefaultApiBaseUrl,
  normalizeApiBaseUrl,
} from "@/lib/api"
import { readStorage, STORAGE_KEYS, writeStorage } from "@/lib/storage"
import { ApiSettingsContext } from "@/features/api-settings/api-settings-context"

export function ApiSettingsProvider({ children }: { children: ReactNode }) {
  const [apiBaseUrl, setApiBaseUrl] = useState(() =>
    normalizeApiBaseUrl(
      readStorage(STORAGE_KEYS.apiBaseUrl, getDefaultApiBaseUrl()),
    ),
  )

  useEffect(() => {
    writeStorage(STORAGE_KEYS.apiBaseUrl, normalizeApiBaseUrl(apiBaseUrl))
  }, [apiBaseUrl])

  const normalizeCurrentApiBaseUrl = useCallback(() => {
    setApiBaseUrl((current) => normalizeApiBaseUrl(current))
  }, [])

  const value = useMemo(
    () => ({
      apiBaseUrl,
      setApiBaseUrl,
      normalizeCurrentApiBaseUrl,
    }),
    [apiBaseUrl, normalizeCurrentApiBaseUrl],
  )

  return (
    <ApiSettingsContext.Provider value={value}>
      {children}
    </ApiSettingsContext.Provider>
  )
}
