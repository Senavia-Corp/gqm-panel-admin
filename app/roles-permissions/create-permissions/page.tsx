"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ActionType = "View" | "Create" | "Edit" | "Delete"
type ServiceType = "Job" | "Subcontractor" | "GQM_Member" | "Technician" | "Client" | "Dashboard"

const ACTIONS: ActionType[] = ["View", "Create", "Edit", "Delete"]
const SERVICES: ServiceType[] = ["Job", "Subcontractor", "GQM_Member", "Technician", "Client", "Dashboard"]

export default function CreatePermissionPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [active, setActive] = useState(true)
  const [action, setAction] = useState<ActionType>("View")
  const [service, setService] = useState<ServiceType>("Job")

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && Boolean(action) && Boolean(service)
  }, [name, action, service])

  const onSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      const payload = {
        Name: name.trim(),
        Description: description.trim() || null,
        Active: active,
        Action: action,
        Service_Associated: service,
      }

      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || `Failed to create permission (${res.status})`)
      }

      router.push("/roles-permissions")
    } catch (e: any) {
      console.error(e)
      setError(e?.message ?? "Failed to create permission")
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Create Permission</h1>
            <p className="text-sm text-muted-foreground">Define what action is allowed for which service.</p>
          </div>

          <Card className="p-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. View Jobs" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Active</label>
                <Select value={active ? "true" : "false"} onValueChange={(v) => setActive(v === "true")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Action</label>
                <Select value={action} onValueChange={(v: any) => setAction(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Service</label>
                <Select value={service} onValueChange={(v: any) => setService(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                />
              </div>
            </div>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => router.push("/roles-permissions")} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                disabled={!canSubmit || submitting}
                className="bg-gqm-green text-white hover:bg-gqm-green/90"
              >
                {submitting ? "Creating..." : "Create Permission"}
              </Button>
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
