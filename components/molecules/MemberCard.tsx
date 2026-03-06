"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Mail, Phone, MapPin } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface MemberCardProps {
  member: {
    id: string
    name: string
    memberId: string
    avatar: string
    email: string
    phone: string
    address: string
  }
  onRemove?: (id: string) => void
  showRemoveButton?: boolean
}

export function MemberCard({ member, onRemove, showRemoveButton = true }: MemberCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        {showRemoveButton && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => onRemove(member.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}

        <div className="flex flex-col items-center text-center">
          <Avatar className="mb-4 h-20 w-20">
            <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>

          <h3 className="mb-1 text-lg font-semibold text-gray-900">{member.name}</h3>
          <p className="mb-4 text-sm text-gray-500">{member.memberId}</p>

          <div className="w-full space-y-2 text-left">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
              <span className="text-sm text-gray-600">{member.email}</span>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
              <span className="text-sm text-gray-600">{member.phone}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <span className="text-sm text-gray-600">{member.address}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
