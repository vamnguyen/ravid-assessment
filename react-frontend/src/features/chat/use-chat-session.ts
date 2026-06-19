import { useContext } from "react"

import { ChatSessionContext } from "@/features/chat/chat-session-context"

export function useChatSession() {
  const context = useContext(ChatSessionContext)

  if (!context) {
    throw new Error("useChatSession must be used within ChatSessionProvider")
  }

  return context
}
