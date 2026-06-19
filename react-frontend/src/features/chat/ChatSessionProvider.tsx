import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"

import { readStorage, STORAGE_KEYS, writeStorage } from "@/lib/storage"
import { ChatSessionContext } from "@/features/chat/chat-session-context"
import type { ChatMessage } from "@/features/chat/types"

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const [chatId, setChatId] = useState(() => readStorage(STORAGE_KEYS.chatId))
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatError, setChatError] = useState("")
  const [isChatting, setIsChatting] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    writeStorage(STORAGE_KEYS.chatId, chatId)
  }, [chatId])

  const appendMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages((current) => [...current, ...newMessages])
  }, [])

  const updateAssistantMessage = useCallback(
    (
      assistantId: string,
      updater: (message: ChatMessage) => ChatMessage,
    ) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId ? updater(message) : message,
        ),
      )
    },
    [],
  )

  const setActiveAbortController = useCallback((controller: AbortController) => {
    abortRef.current = controller
  }, [])

  const clearActiveAbortController = useCallback((controller?: AbortController) => {
    if (!controller || abortRef.current === controller) {
      abortRef.current = null
    }
  }, [])

  const stopStream = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const resetChat = useCallback(() => {
    abortRef.current?.abort()
    setChatId("")
    setMessages([])
    setChatError("")
  }, [])

  const value = useMemo(
    () => ({
      chatId,
      messages,
      chatError,
      isChatting,
      setChatId,
      setChatError,
      setIsChatting,
      appendMessages,
      updateAssistantMessage,
      setActiveAbortController,
      clearActiveAbortController,
      stopStream,
      resetChat,
    }),
    [
      appendMessages,
      chatError,
      chatId,
      clearActiveAbortController,
      isChatting,
      messages,
      resetChat,
      setActiveAbortController,
      stopStream,
      updateAssistantMessage,
    ],
  )

  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  )
}
