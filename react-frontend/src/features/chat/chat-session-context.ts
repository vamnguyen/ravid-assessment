import { createContext } from "react"

import type { ChatMessage } from "@/features/chat/types"

export type ChatSessionContextValue = {
  chatId: string
  messages: ChatMessage[]
  chatError: string
  isChatting: boolean
  setChatId: (value: string) => void
  setChatError: (value: string) => void
  setIsChatting: (value: boolean) => void
  appendMessages: (messages: ChatMessage[]) => void
  updateAssistantMessage: (
    assistantId: string,
    updater: (message: ChatMessage) => ChatMessage,
  ) => void
  setActiveAbortController: (controller: AbortController) => void
  clearActiveAbortController: (controller?: AbortController) => void
  stopStream: () => void
  resetChat: () => void
}

export const ChatSessionContext =
  createContext<ChatSessionContextValue | null>(null)
