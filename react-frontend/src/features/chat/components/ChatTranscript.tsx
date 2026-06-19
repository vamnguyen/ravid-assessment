import { ClipboardIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { copyTextToClipboard } from "@/lib/clipboard"
import { useChatSession } from "@/features/chat/use-chat-session"
import { MessageBubble } from "@/features/chat/components/MessageBubble"

export function ChatTranscript() {
  const { chatId, messages } = useChatSession()

  async function handleCopyChatId() {
    if (await copyTextToClipboard(chatId)) {
      toast.success("Chat ID copied")
    }
  }

  return (
    <div className="flex min-h-[24rem] flex-1 flex-col gap-3 bg-background p-3 lg:min-h-0">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-sm font-medium">Transcript</h2>
          <p className="truncate text-xs text-muted-foreground">
            {chatId ? `Session ${chatId}` : "New session"}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copy chat ID"
              onClick={handleCopyChatId}
              disabled={!chatId}
            >
              <ClipboardIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy chat ID</TooltipContent>
        </Tooltip>
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1 pr-3">
        <div className="flex min-h-full flex-col gap-4">
          {messages.length ? (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          ) : (
            <div className="flex min-h-64 flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              No chat messages yet.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
