import { useCallback, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import {
  CheckCircle2Icon,
  RefreshCcwIcon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import {
  getDocumentStatus,
  getErrorMessage,
  uploadDocument,
} from "@/lib/api"
import type { DocumentStatus, UploadResponse } from "@/lib/api"
import { wait } from "@/lib/async"
import { formatFileSize } from "@/lib/format"
import { useApiSettings } from "@/features/api-settings/use-api-settings"
import { useAuth } from "@/features/auth/use-auth"
import {
  MAX_POLL_ATTEMPTS,
  POLL_DELAY_MS,
  statusBadgeVariant,
  uploadProgress,
} from "@/features/documents/document-status"
import { MetaValue } from "@/features/documents/components/MetaValue"

export function DocumentUploadCard() {
  const { apiBaseUrl } = useApiSettings()
  const { token, isAuthenticated } = useAuth()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus | null>(null)
  const [uploadError, setUploadError] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const progress = uploadProgress(documentStatus, isUploading, isPolling)

  const pollStatus = useCallback(
    async (taskId: string) => {
      if (!token) {
        return
      }

      setIsPolling(true)
      setUploadError("")

      try {
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
          const status = await getDocumentStatus({
            apiBaseUrl,
            token,
            taskId,
          })

          setDocumentStatus(status)

          if (status.status === "SUCCESS") {
            toast.success("Document indexed")
            return
          }

          if (status.status === "FAILURE") {
            toast.error(status.error || "Document ingestion failed")
            return
          }

          await wait(POLL_DELAY_MS)
        }

        setUploadError("Polling timed out. You can refresh the task status manually.")
      } catch (error) {
        setUploadError(getErrorMessage(error))
      } finally {
        setIsPolling(false)
      }
    },
    [apiBaseUrl, token],
  )

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null)
    setUploadError("")
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedFile) {
      setUploadError("Select a PDF, TXT, or Markdown file first.")
      return
    }

    if (!token) {
      setUploadError("Login first so the upload can use your JWT.")
      return
    }

    setIsUploading(true)
    setUploadError("")
    setDocumentStatus(null)

    try {
      const response = await uploadDocument({
        apiBaseUrl,
        token,
        file: selectedFile,
      })

      setUploadResult(response)
      setDocumentStatus({
        task_id: response.task_id,
        status: "PROCESSING",
      })
      toast.success("Upload accepted")
      await pollStatus(response.task_id)
    } catch (error) {
      const message = getErrorMessage(error)
      setUploadError(message)
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  async function handleRefreshStatus() {
    if (uploadResult?.task_id) {
      await pollStatus(uploadResult.task_id)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Upload</CardTitle>
        <CardDescription>PDF, TXT, and Markdown ingestion.</CardDescription>
        <CardAction>
          <Badge variant={statusBadgeVariant(documentStatus?.status)}>
            {documentStatus?.status ?? "Idle"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form className="flex flex-col gap-4" onSubmit={handleUpload}>
          <FieldGroup>
            <Field data-invalid={Boolean(uploadError && !selectedFile)}>
              <FieldLabel htmlFor="document-file">Document file</FieldLabel>
              <Input
                id="document-file"
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                onChange={handleFileChange}
                disabled={!isAuthenticated || isUploading || isPolling}
                aria-invalid={Boolean(uploadError && !selectedFile)}
              />
              {selectedFile ? (
                <FieldDescription>
                  {selectedFile.name} - {formatFileSize(selectedFile.size)}
                </FieldDescription>
              ) : (
                <FieldDescription>
                  Select the file you want Django to parse and index.
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={!isAuthenticated || !selectedFile || isUploading || isPolling}
            >
              {isUploading ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <UploadCloudIcon data-icon="inline-start" />
              )}
              Upload
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!uploadResult || isPolling}
              onClick={handleRefreshStatus}
            >
              {isPolling ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <RefreshCcwIcon data-icon="inline-start" />
              )}
              Refresh status
            </Button>
          </div>
        </form>

        <Progress value={progress} />

        {uploadResult ? (
          <div className="grid gap-3 rounded-lg border bg-background p-3 text-sm md:grid-cols-2">
            <MetaValue label="Document ID" value={uploadResult.document_id} />
            <MetaValue label="Task ID" value={uploadResult.task_id} />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
            No upload task yet.
          </div>
        )}

        {documentStatus?.status === "SUCCESS" ? (
          <Alert>
            <CheckCircle2Icon />
            <AlertTitle>Indexed</AlertTitle>
            <AlertDescription>
              {documentStatus.message ||
                "Document successfully parsed, embedded, and indexed."}
            </AlertDescription>
          </Alert>
        ) : null}

        {uploadError || documentStatus?.status === "FAILURE" ? (
          <Alert variant="destructive">
            <XCircleIcon />
            <AlertTitle>Upload or ingestion failed</AlertTitle>
            <AlertDescription>
              {uploadError || documentStatus?.error}
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}
