"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatMessage } from "@/components/molecules/ChatMessage"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Mic, Paperclip, ImageIcon, Send, MoreVertical, Settings } from 'lucide-react'

interface ChatRoomProps {
  chatId: string
  chatName: string
  chatAvatar: string
  participants: Array<{
    id: string
    name: string
    avatar: string
    role?: string
  }>
  messages: Array<{
    id: string
    content: string
    sender: {
      name: string
      avatar: string
      id: string
    }
    timestamp: string
    isSent: boolean
  }>
  onSendMessage: (message: string) => void
  onOpenSettings: () => void
}

export function ChatRoom({
  chatId,
  chatName,
  chatAvatar,
  participants,
  messages,
  onSendMessage,
  onOpenSettings,
}: ChatRoomProps) {
  const [messageInput, setMessageInput] = useState("")

  const handleSend = () => {
    if (messageInput.trim()) {
      onSendMessage(messageInput)
      setMessageInput("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={chatAvatar || "/placeholder.svg"} alt={chatName} />
              <AvatarFallback className="bg-gqm-green text-white">{chatName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">{chatName}</h3>
              <p className="text-sm text-gray-500">
                {(participants ?? []).length} participants:{" "}
                {(participants ?? []).map((p) => p.name).join(", ")}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpenSettings}>
                <Settings className="mr-2 h-4 w-4" />
                Chat Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-4">
        {(messages ?? []).map((message) => (
          <ChatMessage key={message.id} {...message} />
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <Mic className="h-5 w-5" />
          </Button>

          <div className="relative flex-1">
            <Input
              placeholder="Write message"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-gray-700"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-gray-700"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSend}
            className="bg-gqm-green text-white hover:bg-gqm-green/90"
          >
            Send
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
