"use client"

import type React from "react"

type Props = {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function JobTabLayout({ sidebar, children }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">{children}</div>
      <div className="space-y-6">{sidebar}</div>
    </div>
  )
}
