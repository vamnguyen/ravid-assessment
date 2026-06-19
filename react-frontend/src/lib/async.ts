export function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}
