import { useState } from "react"
import type { FormEvent } from "react"
import { KeyRoundIcon, LogInIcon, UserPlusIcon, XCircleIcon } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getErrorMessage } from "@/lib/api"
import { useAuth } from "@/features/auth/use-auth"
import { AuthFields } from "@/features/auth/components/AuthFields"

type AuthBusyState = "login" | "register" | null

export function AuthTabs() {
  const { login, registerAndLogin } = useAuth()
  const [email, setEmail] = useState("example@gmail.com")
  const [password, setPassword] = useState("password123")
  const [authBusy, setAuthBusy] = useState<AuthBusyState>(null)
  const [authError, setAuthError] = useState("")

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthBusy("login")
    setAuthError("")

    try {
      await login({ email, password })
      toast.success("Logged in")
    } catch (error) {
      const message = getErrorMessage(error)
      setAuthError(message)
      toast.error(message)
    } finally {
      setAuthBusy(null)
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthBusy("register")
    setAuthError("")

    try {
      await registerAndLogin({ email, password })
      toast.success("Registered and logged in")
    } catch (error) {
      const message = getErrorMessage(error)
      setAuthError(message)
      toast.error(message)
    } finally {
      setAuthBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue="login" className="gap-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">
            <LogInIcon data-icon="inline-start" />
            Login
          </TabsTrigger>
          <TabsTrigger value="register">
            <UserPlusIcon data-icon="inline-start" />
            Register
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form className="flex flex-col gap-4" onSubmit={handleLogin}>
            <AuthFields
              idPrefix="login"
              email={email}
              password={password}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              passwordAutoComplete="current-password"
              disabled={authBusy !== null}
            />
            <Button type="submit" disabled={authBusy !== null}>
              {authBusy === "login" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <KeyRoundIcon data-icon="inline-start" />
              )}
              Login
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <form className="flex flex-col gap-4" onSubmit={handleRegister}>
            <AuthFields
              idPrefix="register"
              email={email}
              password={password}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              passwordAutoComplete="new-password"
              disabled={authBusy !== null}
            />
            <Button type="submit" disabled={authBusy !== null}>
              {authBusy === "register" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <UserPlusIcon data-icon="inline-start" />
              )}
              Register & login
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {authError ? (
        <Alert variant="destructive">
          <XCircleIcon />
          <AlertTitle>Auth failed</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
