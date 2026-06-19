import { createContext } from "react"

export type ApiSettingsContextValue = {
  apiBaseUrl: string
  setApiBaseUrl: (value: string) => void
  normalizeCurrentApiBaseUrl: () => void
}

export const ApiSettingsContext =
  createContext<ApiSettingsContextValue | null>(null)
