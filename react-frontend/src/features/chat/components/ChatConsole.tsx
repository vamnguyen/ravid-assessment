import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  getChatSession,
  getErrorMessage,
  listChatSessions,
} from "@/lib/api"
import type { ChatHistoryMessage, ChatSessionSummary } from "@/lib/api"
import { useApiSettings } from "@/features/api-settings/use-api-settings"
import { useAuth } from "@/features/auth/use-auth"
import { ChatControls } from "@/features/chat/components/ChatControls"
import { ChatHistoryPanel } from "@/features/chat/components/ChatHistoryPanel"
import { ChatTranscript } from "@/features/chat/components/ChatTranscript"
import type { ChatMessage } from "@/features/chat/types"
import { useChatSession } from "@/features/chat/use-chat-session"

function historyMessageToChatMessage(message: ChatHistoryMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    meta:
      message.role === "assistant" && message.tokens_consumed
        ? `${message.tokens_consumed} tokens`
        : undefined,
  }
}

export function ChatConsole() {
  const { apiBaseUrl } = useApiSettings()
  const { token, isAuthenticated } = useAuth()
  const {
    chatId,
    messages,
    isChatting,
    setChatId,
    setChatError,
    replaceMessages,
    resetChat,
    stopStream,
  } = useChatSession()
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState("")
  const [loadingSessionId, setLoadingSessionId] = useState("")
  const initialLoadRef = useRef("")

  const refreshSessions = useCallback(async () => {
    if (!token) {
      setSessions([])
      setHistoryError("")
      return
    }

    setIsHistoryLoading(true)
    try {
      const response = await listChatSessions({ apiBaseUrl, token })
      setSessions(response)
      setHistoryError("")
    } catch (error) {
      const message = getErrorMessage(error)
      setHistoryError(message)
    } finally {
      setIsHistoryLoading(false)
    }
  }, [apiBaseUrl, token])

  const handleSelectSession = useCallback(
    async (selectedChatId: string) => {
      if (!token) {
        return
      }

      stopStream()
      setChatError("")
      setLoadingSessionId(selectedChatId)

      try {
        const detail = await getChatSession({
          apiBaseUrl,
          token,
          chatId: selectedChatId,
        })
        setChatId(detail.id)
        replaceMessages(detail.messages.map(historyMessageToChatMessage))
        setHistoryError("")
      } catch (error) {
        const message = getErrorMessage(error)
        setHistoryError(message)
        setChatError(message)
        toast.error(message)
      } finally {
        setLoadingSessionId("")
      }
    },
    [apiBaseUrl, replaceMessages, setChatError, setChatId, stopStream, token],
  )

  const handleNewChat = useCallback(() => {
    resetChat()
  }, [resetChat])

  useEffect(() => {
    if (!isChatting) {
      const timeoutId = window.setTimeout(() => {
        void refreshSessions()
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    return undefined
  }, [chatId, isChatting, refreshSessions])

  useEffect(() => {
    if (
      !token ||
      !chatId ||
      messages.length ||
      isChatting ||
      initialLoadRef.current === chatId
    ) {
      return
    }

    initialLoadRef.current = chatId
    void handleSelectSession(chatId)
  }, [chatId, handleSelectSession, isChatting, messages.length, token])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat</CardTitle>
        <CardDescription>Review past conversations and continue chatting.</CardDescription>
        <CardAction>
          <Badge variant="default">Streaming ready</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid min-h-[44rem] overflow-hidden border-t lg:grid-cols-[19rem_minmax(0,1fr)]">
          <ChatHistoryPanel
            activeChatId={chatId}
            disabled={isChatting || Boolean(loadingSessionId)}
            error={historyError}
            isAuthenticated={isAuthenticated}
            isLoading={isHistoryLoading}
            loadingSessionId={loadingSessionId}
            sessions={sessions}
            onNewChat={handleNewChat}
            onRefresh={refreshSessions}
            onSelectSession={handleSelectSession}
          />
          <section className="flex min-h-[38rem] flex-col border-t lg:min-h-0 lg:border-t-0 lg:border-l">
            <ChatTranscript />
            <Separator />
            <ChatControls className="bg-background p-4" />
          </section>
        </div>
      </CardContent>
    </Card>
  )
}
