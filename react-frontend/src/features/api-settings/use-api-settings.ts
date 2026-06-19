import { useContext } from "react"

import { ApiSettingsContext } from "@/features/api-settings/api-settings-context"

export function useApiSettings() {
  const context = useContext(ApiSettingsContext)

  if (!context) {
    throw new Error("useApiSettings must be used within ApiSettingsProvider")
  }

  return context
}
