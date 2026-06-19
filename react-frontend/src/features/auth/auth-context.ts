import { createContext } from "react"

import type { AuthResponse, RegisterResponse } from "@/lib/api"

export type AuthCredentials = {
  email: string
  password: string
}

export type AuthContextValue = {
  token: string
  isAuthenticated: boolean
  login: (credentials: AuthCredentials) => Promise<AuthResponse>
  registerAndLogin: (credentials: AuthCredentials) => Promise<RegisterResponse>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
