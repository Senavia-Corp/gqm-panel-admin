"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { X, UserPlus } from 'lucide-react'

interface ChatSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  chatName: string
  chatAvatar: string
  participants: Array<{
    id: string
    name: string
    avatar: string
    role?: string
  }>
  onSave: (name: string, participants: Array<any>) => void
}

export function ChatSettingsDialog({
  isOpen,
  onClose,
  chatName,
  chatAvatar,
  participants,
  onSave,
}: ChatSettingsDialogProps) {
  const [name, setName] = useState(chatName)
  const [members, setMembers] = useState(participants)

  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter((m) => m.id !== memberId))
  }

  const handleSave = () => {
    onSave(name, members)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
          <DialogDescription>
            Manage chat name, picture, and participants
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chat Name */}
          <div>
            <Label htmlFor="chatName" className="mb-2 block">
              Chat Name
            </Label>
            <Input
              id="chatName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter chat name"
            />
          </div>

          {/* Chat Picture */}
          <div>
            <Label className="mb-2 block">Chat Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={chatAvatar || "/placeholder.svg"} alt={name} />
                <AvatarFallback className="bg-gqm-green text-white">
                  {name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                Change Picture
              </Button>
            </div>
          </div>

          {/* Participants */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Participants ({members.length})</Label>
              <Button variant="outline" size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </div>

            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      {member.role && <p className="text-xs text-gray-500">{member.role}</p>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-gqm-green hover:bg-gqm-green/90">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
