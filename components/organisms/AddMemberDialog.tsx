"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AvailableMember {
  id: string
  name: string
  memberId: string
  avatar: string
  role: string
  email: string
  phone: string
  address: string
  status: string
}

interface AddMemberDialogProps {
  isOpen: boolean
  onClose: () => void
  availableMembers: AvailableMember[]
  onAddMember: (member: AvailableMember) => void
}

export function AddMemberDialog({
  isOpen,
  onClose,
  availableMembers,
  onAddMember,
}: AddMemberDialogProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("")

  const handleAdd = () => {
    const member = availableMembers.find((m) => m.id === selectedMemberId)
    if (member) {
      onAddMember(member)
      setSelectedMemberId("")
      onClose()
    }
  }

  const selectedMember = availableMembers.find((m) => m.id === selectedMemberId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add GQM Member to Job</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="member-select">Select Member</Label>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger id="member-select">
                <SelectValue placeholder="Choose a GQM member..." />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>
                        {member.name} - {member.role}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMember && (
            <div className="rounded-lg border bg-gray-50 p-4">
              <h4 className="mb-3 font-semibold">Member Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member ID:</span>
                  <span className="font-medium">{selectedMember.memberId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium">{selectedMember.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{selectedMember.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{selectedMember.phone}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedMemberId}
            className="bg-gqm-green hover:bg-gqm-green/90"
          >
            Add Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
