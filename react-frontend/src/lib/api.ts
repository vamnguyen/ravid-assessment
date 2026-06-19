const DEFAULT_API_BASE_URL = "http://localhost:8000/api"

export type AuthResponse = {
  message: string
  token: string
}

export type RegisterResponse = {
  message: string
  user_id: string
}

export type UploadResponse = {
  message: string
  document_id: string
  task_id: string
}

export type DocumentStatus = {
  task_id: string
  status: "PROCESSING" | "SUCCESS" | "FAILURE"
  message?: string
  error?: string
}

export type ChatQueryPayload = {
  query: string
  chat_id?: string
}

export type ChatResponse = {
  answer: string
  tokens_consumed: number
  chat_id: string
}

export type ChatHistoryMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  tokens_consumed: number
  created_at: string
}

export type ChatSessionSummary = {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  last_message_preview: string
  last_message_role: "" | "user" | "assistant"
}

export type ChatSessionDetail = Omit<
  ChatSessionSummary,
  "last_message_preview" | "last_message_role"
> & {
  messages: ChatHistoryMessage[]
}

export type ChatStreamEvent =
  | { event: "token"; data: { content: string } }
  | { event: "final"; data: ChatResponse }
  | { event: "error"; data: { error: string } }
  | { event: string; data: unknown }

type RequestOptions = {
  apiBaseUrl: string
  token?: string
}

export class ApiError extends Error {
  status?: number
  payload?: unknown

  constructor(message: string, status?: number, payload?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }
}

export function getDefaultApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
}

export function normalizeApiBaseUrl(value: string) {
  return (value || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, "")
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Unexpected error"
}

export function getPayloadErrorMessage(payload: unknown, fallback: string) {
  if (!payload) {
    return fallback
  }

  if (typeof payload === "string") {
    return payload
  }

  if (typeof payload !== "object") {
    return fallback
  }

  const record = payload as Record<string, unknown>
  for (const key of ["error", "detail", "message"]) {
    const value = record[key]

    if (typeof value === "string" && value.trim()) {
      return value
    }
  }

  const firstValue = Object.values(record)[0]
  if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
    return firstValue[0]
  }

  return fallback
}

async function readResponsePayload(response: Response) {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function buildUrl(apiBaseUrl: string, path: string) {
  return `${normalizeApiBaseUrl(apiBaseUrl)}${path}`
}

async function requestJson<T>(
  path: string,
  options: RequestOptions & RequestInit,
) {
  const headers = new Headers(options.headers)

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`)
  }

  const response = await fetch(buildUrl(options.apiBaseUrl, path), {
    ...options,
    headers,
  })
  const payload = await readResponsePayload(response)

  if (!response.ok) {
    throw new ApiError(
      getPayloadErrorMessage(payload, response.statusText || "Request failed"),
      response.status,
      payload,
    )
  }

  return payload as T
}

export function registerUser(
  options: RequestOptions & { email: string; password: string },
) {
  return requestJson<RegisterResponse>("/register/", {
    apiBaseUrl: options.apiBaseUrl,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: options.email, password: options.password }),
  })
}

export function loginUser(
  options: RequestOptions & { email: string; password: string },
) {
  return requestJson<AuthResponse>("/login/", {
    apiBaseUrl: options.apiBaseUrl,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: options.email, password: options.password }),
  })
}

export function uploadDocument(options: RequestOptions & { file: File }) {
  const body = new FormData()
  body.append("file", options.file)

  return requestJson<UploadResponse>("/documents/upload/", {
    apiBaseUrl: options.apiBaseUrl,
    token: options.token,
    method: "POST",
    body,
  })
}

export function getDocumentStatus(
  options: RequestOptions & { taskId: string },
) {
  const taskId = encodeURIComponent(options.taskId)

  return requestJson<DocumentStatus>(`/documents/status/?task_id=${taskId}`, {
    apiBaseUrl: options.apiBaseUrl,
    token: options.token,
    method: "GET",
  })
}

export function queryChat(
  options: RequestOptions & { payload: ChatQueryPayload },
) {
  return requestJson<ChatResponse>("/chat/query/", {
    apiBaseUrl: options.apiBaseUrl,
    token: options.token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options.payload),
  })
}

export function listChatSessions(options: RequestOptions) {
  return requestJson<ChatSessionSummary[]>("/chat/sessions/", {
    apiBaseUrl: options.apiBaseUrl,
    token: options.token,
    method: "GET",
  })
}

export function getChatSession(
  options: RequestOptions & { chatId: string },
) {
  return requestJson<ChatSessionDetail>(
    `/chat/sessions/${encodeURIComponent(options.chatId)}/`,
    {
      apiBaseUrl: options.apiBaseUrl,
      token: options.token,
      method: "GET",
    },
  )
}

function parseSseBlock(block: string): ChatStreamEvent | null {
  const dataLines: string[] = []
  let event = "message"

  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) {
      continue
    }

    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim()
      continue
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart())
    }
  }

  if (!dataLines.length) {
    return null
  }

  const rawData = dataLines.join("\n")

  try {
    return { event, data: JSON.parse(rawData) as unknown }
  } catch {
    return { event, data: rawData }
  }
}

export async function streamChat(
  options: RequestOptions & {
    payload: ChatQueryPayload
    signal?: AbortSignal
    onEvent: (event: ChatStreamEvent) => void
  },
) {
  const headers = new Headers({ "Content-Type": "application/json" })

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`)
  }

  const response = await fetch(buildUrl(options.apiBaseUrl, "/chat/query/stream/"), {
    method: "POST",
    headers,
    body: JSON.stringify(options.payload),
    signal: options.signal,
  })

  if (!response.ok) {
    const payload = await readResponsePayload(response)
    throw new ApiError(
      getPayloadErrorMessage(payload, response.statusText || "Stream failed"),
      response.status,
      payload,
    )
  }

  if (!response.body) {
    throw new ApiError("Browser did not expose a readable stream.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const blocks = buffer.split(/\n\n/)
    buffer = blocks.pop() ?? ""

    for (const block of blocks) {
      const event = parseSseBlock(block)
      if (event) {
        options.onEvent(event)
      }
    }

    if (done) {
      break
    }
  }

  const finalEvent = parseSseBlock(buffer)
  if (finalEvent) {
    options.onEvent(finalEvent)
  }
}
