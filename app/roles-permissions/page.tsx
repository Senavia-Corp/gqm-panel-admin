"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Shield, Users, Plus, Lock } from "lucide-react"
import PermissionsTable from "@/components/organisms/roles-permissions/PermissionsTable"
import RolesTable from "@/components/organisms/roles-permissions/RolesTable"

type Tab = "permissions" | "roles"

export default function RolesPermissionsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [tab, setTab] = useState<Tab>("permissions")

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
        <TopBar />

        <main className="flex-1 overflow-y-auto p-6">
          {/* ── Page header ─────────────────────────────────────────────── */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <Lock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Roles & Permissions</h1>
                <p className="text-sm text-slate-500">Manage access control for admin panel sections.</p>
              </div>
            </div>

            <Button
              onClick={() =>
                router.push(
                  tab === "permissions"
                    ? "/roles-permissions/create-permissions"
                    : "/roles-permissions/create-roles",
                )
              }
              className="flex-shrink-0 gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {tab === "permissions" ? "New Permission" : "New Role"}
            </Button>
          </div>

          {/* ── Segmented tab switcher ───────────────────────────────────── */}
          <div className="mb-5 inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setTab("permissions")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                tab === "permissions"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Shield className="h-4 w-4" />
              Permissions
            </button>
            <button
              onClick={() => setTab("roles")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                tab === "roles"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Users className="h-4 w-4" />
              Roles
            </button>
          </div>

          {/* ── Table card ──────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6">
              {tab === "permissions" ? <PermissionsTable /> : <RolesTable />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}