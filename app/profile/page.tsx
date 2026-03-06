"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Card, CardContent } from "@/components/ui/card"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <h1 className="mb-6 text-3xl font-bold">Profile</h1>
          <Card>
            <CardContent className="flex h-96 items-center justify-center">
              <p className="text-muted-foreground">Profile section - Coming soon</p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
