import type { ChatResponse, ChatStreamEvent } from "@/lib/api"
import type { ChatMode } from "@/features/chat/types"

export function coerceChatMode(value: string): ChatMode {
  return value === "json" ? "json" : "stream"
}

export function getStreamContent(event: ChatStreamEvent) {
  if (event.event !== "token" || typeof event.data !== "object" || !event.data) {
    return ""
  }

  const content = (event.data as { content?: unknown }).content
  return typeof content === "string" ? content : ""
}

export function getStreamError(event: ChatStreamEvent) {
  if (event.event !== "error" || typeof event.data !== "object" || !event.data) {
    return "Stream failed"
  }

  const message = (event.data as { error?: unknown }).error
  return typeof message === "string" ? message : "Stream failed"
}

export function getStreamFinal(event: ChatStreamEvent) {
  if (event.event !== "final" || typeof event.data !== "object" || !event.data) {
    return null
  }

  return event.data as ChatResponse
}
