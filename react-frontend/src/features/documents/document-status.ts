import type { DocumentStatus } from "@/lib/api"

export const POLL_DELAY_MS = 2000
export const MAX_POLL_ATTEMPTS = 90

export function statusBadgeVariant(status?: DocumentStatus["status"]) {
  if (status === "SUCCESS") {
    return "default"
  }

  if (status === "FAILURE") {
    return "destructive"
  }

  return "secondary"
}

export function uploadProgress(
  status: DocumentStatus | null,
  isUploading: boolean,
  isPolling: boolean,
) {
  if (status?.status === "SUCCESS" || status?.status === "FAILURE") {
    return 100
  }

  if (isPolling) {
    return 70
  }

  if (isUploading) {
    return 35
  }

  return 0
}
