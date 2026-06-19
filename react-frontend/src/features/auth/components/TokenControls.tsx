import { ClipboardIcon, LogOutIcon, PlugIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { copyTextToClipboard } from "@/lib/clipboard"
import { formatToken } from "@/lib/format"
import { useAuth } from "@/features/auth/use-auth"
import { useChatSession } from "@/features/chat/use-chat-session"

export function TokenControls() {
  const { token, logout } = useAuth()
  const { resetChat } = useChatSession()

  async function handleCopyToken() {
    if (await copyTextToClipboard(token)) {
      toast.success("Token copied")
    }
  }

  function handleLogout() {
    resetChat()
    logout()
    toast.info("Token cleared")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm">
        <PlugIcon className="size-4 text-muted-foreground" />
        <span className="truncate font-mono text-muted-foreground">
          {formatToken(token)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyToken}
              disabled={!token}
            >
              <ClipboardIcon data-icon="inline-start" />
              Copy token
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy JWT</TooltipContent>
        </Tooltip>
        <Button
          type="button"
          variant="ghost"
          onClick={handleLogout}
          disabled={!token}
        >
          <LogOutIcon data-icon="inline-start" />
          Clear
        </Button>
      </div>
    </div>
  )
}
