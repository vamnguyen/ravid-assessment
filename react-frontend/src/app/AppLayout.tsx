import { NavLink, Outlet } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { normalizeApiBaseUrl } from "@/lib/api"
import { cn } from "@/lib/utils"
import { routes } from "@/app/routes"
import { useApiSettings } from "@/features/api-settings/use-api-settings"
import { useAuth } from "@/features/auth/use-auth"

export function AppLayout() {
  const { apiBaseUrl } = useApiSettings()
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-svh bg-muted/30 text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-2xl font-semibold">
                R.A.V.I.D. Test Console
              </h1>
              <p className="text-sm text-muted-foreground">
                Upload documents, poll ingestion, and inspect chat responses.
              </p>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge variant={isAuthenticated ? "default" : "secondary"}>
                {isAuthenticated ? "JWT ready" : "No JWT"}
              </Badge>
              <Badge
                variant="outline"
                className="max-w-[min(100%,24rem)] truncate"
              >
                {normalizeApiBaseUrl(apiBaseUrl)}
              </Badge>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2" aria-label="Primary navigation">
            {routes.map((route) => (
              <NavLink
                key={route.to}
                to={route.to}
                end={route.end}
                className={({ isActive }) =>
                  cn(
                    buttonVariants({
                      variant: isActive ? "default" : "outline",
                      size: "sm",
                    }),
                  )
                }
              >
                {route.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
        <Outlet />
      </main>
    </div>
  )
}
