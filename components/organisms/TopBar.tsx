"use client"

import { Bell } from "lucide-react"
import { SearchBar } from "@/components/molecules/SearchBar"
import { UserAvatar } from "@/components/atoms/UserAvatar"
import { Button } from "@/components/ui/button"

interface TopBarProps {
  user: {
    name: string
    role: string
    avatar: string
  } | null
}

export function TopBar({ user }: TopBarProps) {
  const userName = user?.name || "Admin User"
  const userRole = user?.role || "Administrator"
  const userAvatar = user?.avatar || "/placeholder.svg?height=40&width=40"

  return (
    <div className="flex items-center justify-between border-b bg-white px-6 py-4">
      <SearchBar placeholder="Search" className="w-96" />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        <div className="flex items-center gap-3">
          <UserAvatar src={userAvatar} alt={userName} size="md" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{userName}</span>
            <span className="text-xs text-muted-foreground">{userRole}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
