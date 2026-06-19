import { useState } from "react"
import type { FormEvent } from "react"
import {
  FileTextIcon,
  RadioIcon,
  RotateCcwIcon,
  SendIcon,
  StopCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  getErrorMessage,
  queryChat,
  streamChat,
} from "@/lib/api"
import type { ChatResponse } from "@/lib/api"
import { isAbortError } from "@/lib/async"
import { createId } from "@/lib/ids"
import { useApiSettings } from "@/features/api-settings/use-api-settings"
import { useAuth } from "@/features/auth/use-auth"
import {
  coerceChatMode,
  getStreamContent,
  getStreamError,
  getStreamFinal,
} from "@/features/chat/stream-events"
import type { ChatMode, ChatMessage } from "@/features/chat/types"
import { useChatSession } from "@/features/chat/use-chat-session"

const STREAM_REVEAL_CHARS_PER_FRAME = 8

function createStreamRevealBuffer(appendContent: (content: string) => void) {
  let buffer = ""
  let frameId: number | null = null
  let idleResolver: (() => void) | null = null
  let canceled = false

  function resolveIdleIfNeeded() {
    if (!buffer && frameId === null && idleResolver) {
      idleResolver()
      idleResolver = null
    }
  }

  function scheduleFrame() {
    if (canceled || frameId !== null || !buffer) {
      resolveIdleIfNeeded()
      return
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = null

      if (canceled) {
        buffer = ""
        resolveIdleIfNeeded()
        return
      }

      const nextContent = buffer.slice(0, STREAM_REVEAL_CHARS_PER_FRAME)
      buffer = buffer.slice(STREAM_REVEAL_CHARS_PER_FRAME)
      appendContent(nextContent)

      scheduleFrame()
    })
  }

  return {
    push(content: string) {
      if (!content || canceled) {
        return
      }

      buffer += content
      scheduleFrame()
    },
    drain() {
      if (!buffer && frameId === null) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        idleResolver = resolve
        scheduleFrame()
      })
    },
    cancel() {
      canceled = true
      buffer = ""

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
        frameId = null
      }

      resolveIdleIfNeeded()
    },
  }
}

export function ChatControls() {
  const { apiBaseUrl } = useApiSettings()
  const { token, isAuthenticated } = useAuth()
  const {
    chatId,
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
  } = useChatSession()
  const [chatMode, setChatMode] = useState<ChatMode>("stream")
  const [query, setQuery] = useState("What can you tell me from my documents?")

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return
    }

    if (!token) {
      setChatError("Login first so chat requests include your JWT.")
      return
    }

    stopStream()
    setChatError("")
    setIsChatting(true)

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmedQuery,
    }
    const assistantId = createId()
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      pending: true,
    }

    appendMessages([userMessage, assistantMessage])

    const payload = {
      query: trimmedQuery,
      ...(chatId ? { chat_id: chatId } : {}),
    }

    try {
      if (chatMode === "json") {
        const response = await queryChat({ apiBaseUrl, token, payload })
        setChatId(response.chat_id)
        updateAssistantMessage(assistantId, () => ({
          id: assistantId,
          role: "assistant",
          content: response.answer,
          meta: `${response.tokens_consumed} tokens`,
        }))
        return
      }

      const controller = new AbortController()
      let finalResponse: ChatResponse | null = null
      let streamError = ""
      const revealBuffer = createStreamRevealBuffer((content) => {
        updateAssistantMessage(assistantId, (message) => ({
          ...message,
          content: `${message.content}${content}`,
        }))
      })

      controller.signal.addEventListener("abort", revealBuffer.cancel, {
        once: true,
      })
      setActiveAbortController(controller)

      await streamChat({
        apiBaseUrl,
        token,
        payload,
        signal: controller.signal,
        onEvent: (streamEvent) => {
          const tokenContent = getStreamContent(streamEvent)
          if (tokenContent) {
            revealBuffer.push(tokenContent)
            return
          }

          const final = getStreamFinal(streamEvent)
          if (final) {
            setChatId(final.chat_id)
            finalResponse = final
            return
          }

          if (streamEvent.event === "error") {
            const message = getStreamError(streamEvent)
            streamError = message
            revealBuffer.cancel()
            setChatError(message)
            updateAssistantMessage(assistantId, (current) => ({
              ...current,
              content: current.content || message,
              error: true,
              pending: false,
            }))
            toast.error(message)
          }
        },
      })

      await revealBuffer.drain()

      if (controller.signal.aborted) {
        updateAssistantMessage(assistantId, (message) => ({
          ...message,
          content: message.content || "Stream stopped.",
          pending: false,
        }))
        return
      }

      if (streamError) {
        return
      }

      updateAssistantMessage(assistantId, (message) => ({
        ...message,
        content: message.content || finalResponse?.answer || "",
        meta: finalResponse ? `${finalResponse.tokens_consumed} tokens` : message.meta,
        pending: false,
      }))
    } catch (error) {
      if (isAbortError(error)) {
        updateAssistantMessage(assistantId, (message) => ({
          ...message,
          content: message.content || "Stream stopped.",
          pending: false,
        }))
        return
      }

      const message = getErrorMessage(error)
      setChatError(message)
      updateAssistantMessage(assistantId, () => ({
        id: assistantId,
        role: "assistant",
        content: message,
        error: true,
      }))
      toast.error(message)
    } finally {
      clearActiveAbortController()
      setIsChatting(false)
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleAsk}>
      <Tabs
        value={chatMode}
        onValueChange={(value) => setChatMode(coerceChatMode(value))}
        className="gap-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stream">
            <RadioIcon data-icon="inline-start" />
            Stream
          </TabsTrigger>
          <TabsTrigger value="json">
            <FileTextIcon data-icon="inline-start" />
            JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stream" className="text-muted-foreground">
          Tokens are appended as SSE events arrive.
        </TabsContent>
        <TabsContent value="json" className="text-muted-foreground">
          The response renders after the request completes.
        </TabsContent>
      </Tabs>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="chat-id">Chat ID</FieldLabel>
          <Input
            id="chat-id"
            value={chatId}
            onChange={(event) => setChatId(event.target.value)}
            placeholder="Leave empty to create a new session"
          />
        </Field>

        <Field data-invalid={Boolean(chatError)}>
          <FieldLabel htmlFor="query">Question</FieldLabel>
          <Textarea
            id="query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            rows={7}
            aria-invalid={Boolean(chatError)}
          />
          <FieldError>{chatError}</FieldError>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!isAuthenticated || isChatting}>
          {isChatting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SendIcon data-icon="inline-start" />
          )}
          Send
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!isChatting}
          onClick={stopStream}
        >
          <StopCircleIcon data-icon="inline-start" />
          Stop
        </Button>
        <Button type="button" variant="ghost" onClick={resetChat}>
          <RotateCcwIcon data-icon="inline-start" />
          New chat
        </Button>
      </div>
    </form>
  )
}
