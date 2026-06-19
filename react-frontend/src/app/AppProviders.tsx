import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ApiSettingsProvider } from "@/features/api-settings/ApiSettingsProvider"
import { AuthProvider } from "@/features/auth/AuthProvider"
import { ChatSessionProvider } from "@/features/chat/ChatSessionProvider"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <ApiSettingsProvider>
          <AuthProvider>
            <ChatSessionProvider>{children}</ChatSessionProvider>
          </AuthProvider>
        </ApiSettingsProvider>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  )
}
