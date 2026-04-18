"use client"

import React from "react"
import { InboxIcon } from "lucide-react"

export function EmptyState({ message = "No data available" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
      <InboxIcon className="h-10 w-10 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
