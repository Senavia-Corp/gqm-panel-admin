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

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          {/* ── Page header ─────────────────────────────────────────────── */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Roles & Permissions</h1>
                <p className="hidden sm:block text-sm text-slate-500">Manage access control for admin panel sections.</p>
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
              <span className="sm:hidden">New</span>
              <span className="hidden sm:inline">{tab === "permissions" ? "New Permission" : "New Role"}</span>
            </Button>
          </div>

          {/* ── Segmented tab switcher ───────────────────────────────────── */}
          <div className="mb-5 inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setTab("permissions")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all ${
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
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all ${
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
            <div className="p-4 sm:p-6">
              {tab === "permissions" ? <PermissionsTable /> : <RolesTable />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}