"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChatRoom } from "@/components/organisms/ChatRoom"
import type { UserRole } from "@/lib/types"

type Props = {
  role: UserRole
  activeChat: string
  setActiveChat: (value: string) => void
  adminChatParticipants: any[]
  generalChatParticipants: any[]
  adminMessages: any[]
  generalMessages: any[]
  onSendMessage: (msg: string) => void
  onOpenSettings: () => void
}

export function JobChatTab({
  role,
  activeChat,
  setActiveChat,
  adminChatParticipants,
  generalChatParticipants,
  adminMessages,
  generalMessages,
  onSendMessage,
  onOpenSettings,
}: Props) {
  return (
    <Card>
      {role === "GQM_MEMBER" && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-lg border bg-gray-50 p-1">
              <Button
                variant={activeChat === "admin" ? "default" : "ghost"}
                className={`${activeChat === "admin" ? "bg-gqm-green text-white hover:bg-gqm-green/90" : ""}`}
                onClick={() => setActiveChat("admin")}
              >
                Admin Chat
              </Button>
              <Button
                variant={activeChat === "general" ? "default" : "ghost"}
                className={`${activeChat === "general" ? "bg-gqm-green text-white hover:bg-gqm-green/90" : ""}`}
                onClick={() => setActiveChat("general")}
              >
                General
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="h-[calc(100vh-350px)] overflow-y-auto p-0">
        {activeChat === "admin" && role === "GQM_MEMBER" && (
          <ChatRoom
            chatId="admin"
            chatName="Admin Discussion"
            chatAvatar="/admin-interface.png"
            participants={adminChatParticipants ?? []}
            messages={adminMessages ?? []}
            onSendMessage={onSendMessage}
            onOpenSettings={onOpenSettings}
          />
        )}

        {(activeChat === "general" || role === "LEAD_TECHNICIAN") && (
          <ChatRoom
            chatId="general"
            chatName="General Project Chat"
            chatAvatar="/diverse-professional-team.png"
            participants={generalChatParticipants ?? []}
            messages={generalMessages ?? []}
            onSendMessage={onSendMessage}
            onOpenSettings={onOpenSettings}
          />
        )}
      </CardContent>
    </Card>
  )
}
