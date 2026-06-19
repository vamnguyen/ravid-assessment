export type ChatMode = "stream" | "json"

export type ChatMessage = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  meta?: string
  pending?: boolean
  error?: boolean
}
