import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/features/chat/types"

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <article
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "flex max-w-[88%] flex-col gap-2 rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
          message.error && "bg-destructive/10 text-destructive",
        )}
      >
        {message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        )}
        {message.pending || message.meta ? (
          <div className="flex items-center gap-2 text-xs opacity-75">
            {message.pending ? <Spinner /> : null}
            {message.meta ? <span>{message.meta}</span> : <span>Streaming</span>}
          </div>
        ) : null}
      </div>
    </article>
  )
}
