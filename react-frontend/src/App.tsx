import { Navigate, Route, Routes } from "react-router-dom"

import { AppLayout } from "@/app/AppLayout"
import { ChatPage } from "@/pages/ChatPage"
import { ConnectionPage } from "@/pages/ConnectionPage"
import { DocumentsPage } from "@/pages/DocumentsPage"

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ConnectionPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
