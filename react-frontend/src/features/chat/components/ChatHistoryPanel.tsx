import {
  MessageSquareTextIcon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ChatSessionSummary } from "@/lib/api"

type ChatHistoryPanelProps = {
  activeChatId: string
  disabled: boolean
  error: string
  isAuthenticated: boolean
  isLoading: boolean
  loadingSessionId: string
  sessions: ChatSessionSummary[]
  onNewChat: () => void
  onRefresh: () => void
  onSelectSession: (chatId: string) => void
}

function formatSessionTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getSessionPreview(session: ChatSessionSummary) {
  if (session.last_message_preview) {
    return session.last_message_preview
  }

  return "No messages yet."
}

export function ChatHistoryPanel({
  activeChatId,
  disabled,
  error,
  isAuthenticated,
  isLoading,
  loadingSessionId,
  sessions,
  onNewChat,
  onRefresh,
  onSelectSession,
}: ChatHistoryPanelProps) {
  return (
    <aside className="flex min-h-[18rem] flex-col bg-muted/30 lg:min-h-0">
      <div className="flex items-center justify-between gap-3 border-b p-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquareTextIcon className="shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h2 className="text-sm font-medium">History</h2>
            <p className="truncate text-xs text-muted-foreground">
              {sessions.length ? `${sessions.length} conversations` : "No conversations"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Refresh history"
                disabled={!isAuthenticated || disabled || isLoading}
                onClick={onRefresh}
              >
                <RefreshCwIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh history</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="New chat"
                disabled={disabled}
                onClick={onNewChat}
              >
                <PlusIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New chat</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {error ? (
        <div className="border-b px-3 py-2 text-xs text-destructive">{error}</div>
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 p-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-md border p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : null}

          {!isLoading && !isAuthenticated ? (
            <div className="flex h-36 items-center justify-center rounded-md border border-dashed bg-background px-4 text-center text-sm text-muted-foreground">
              Login to view chat history.
            </div>
          ) : null}

          {!isLoading && isAuthenticated && !sessions.length ? (
            <div className="flex h-36 items-center justify-center rounded-md border border-dashed bg-background px-4 text-center text-sm text-muted-foreground">
              Start a chat to create history.
            </div>
          ) : null}

          {!isLoading && isAuthenticated
            ? sessions.map((session) => {
                const isActive = session.id === activeChatId
                const isSessionLoading = session.id === loadingSessionId

                return (
                  <button
                    key={session.id}
                    type="button"
                    data-chat-session-id={session.id}
                    className={cn(
                      "flex min-h-24 w-full flex-col gap-2 rounded-md border bg-background p-3 text-left transition-colors",
                      "hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60",
                      isActive && "border-primary bg-accent text-accent-foreground",
                    )}
                    aria-current={isActive ? "true" : undefined}
                    disabled={disabled || isSessionLoading}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-medium leading-snug">
                        {session.title || "Untitled chat"}
                      </span>
                      {isSessionLoading ? <RefreshCwIcon className="shrink-0" /> : null}
                    </div>

                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {getSessionPreview(session)}
                    </p>

                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {formatSessionTime(session.updated_at)}
                      </span>
                      <Badge variant="secondary">{session.message_count}</Badge>
                    </div>
                  </button>
                )
              })
            : null}
        </div>
      </ScrollArea>
    </aside>
  )
}
