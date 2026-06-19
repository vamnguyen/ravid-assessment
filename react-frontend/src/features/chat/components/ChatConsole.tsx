import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChatControls } from "@/features/chat/components/ChatControls"
import { ChatTranscript } from "@/features/chat/components/ChatTranscript"

export function ChatConsole() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat</CardTitle>
        <CardDescription>POST query and Server-Sent Events stream.</CardDescription>
        <CardAction>
          <Badge variant="default">Streaming ready</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <ChatControls />
        <ChatTranscript />
      </CardContent>
    </Card>
  )
}
