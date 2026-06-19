import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useApiSettings } from "@/features/api-settings/use-api-settings"
import { useAuth } from "@/features/auth/use-auth"
import { AuthTabs } from "@/features/auth/components/AuthTabs"
import { TokenControls } from "@/features/auth/components/TokenControls"

export function ConnectionCard() {
  const { apiBaseUrl, setApiBaseUrl, normalizeCurrentApiBaseUrl } =
    useApiSettings()
  const { isAuthenticated } = useAuth()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection</CardTitle>
        <CardDescription>JWT auth and backend URL.</CardDescription>
        <CardAction>
          <Badge variant={isAuthenticated ? "default" : "secondary"}>
            {isAuthenticated ? "Authenticated" : "Anonymous"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="api-base-url">API base URL</FieldLabel>
            <Input
              id="api-base-url"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              onBlur={normalizeCurrentApiBaseUrl}
            />
            <FieldDescription>
              Default backend path is http://localhost:8000/api.
            </FieldDescription>
          </Field>
        </FieldGroup>

        <AuthTabs />
        <Separator />
        <TokenControls />
      </CardContent>
    </Card>
  )
}
