import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

import { loginUser, registerUser } from "@/lib/api"
import { readStorage, STORAGE_KEYS, writeStorage } from "@/lib/storage"
import { AuthContext } from "@/features/auth/auth-context"
import type { AuthCredentials } from "@/features/auth/auth-context"
import { useApiSettings } from "@/features/api-settings/use-api-settings"

export function AuthProvider({ children }: { children: ReactNode }) {
  const { apiBaseUrl } = useApiSettings()
  const [token, setToken] = useState(() => readStorage(STORAGE_KEYS.token))

  useEffect(() => {
    writeStorage(STORAGE_KEYS.token, token)
  }, [token])

  const login = useCallback(
    async ({ email, password }: AuthCredentials) => {
      const response = await loginUser({ apiBaseUrl, email, password })
      setToken(response.token)
      return response
    },
    [apiBaseUrl],
  )

  const registerAndLogin = useCallback(
    async ({ email, password }: AuthCredentials) => {
      const registerResponse = await registerUser({ apiBaseUrl, email, password })
      const loginResponse = await loginUser({ apiBaseUrl, email, password })
      setToken(loginResponse.token)
      return registerResponse
    },
    [apiBaseUrl],
  )

  const logout = useCallback(() => {
    setToken("")
  }, [])

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      registerAndLogin,
      logout,
    }),
    [login, logout, registerAndLogin, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
