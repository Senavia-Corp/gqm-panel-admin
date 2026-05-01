"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { usePermissions } from "@/hooks/usePermissions"
import { Button } from "@/components/ui/button"
import { AlertCircle, Wrench, Users } from "lucide-react"

import { SubcontractorsTab } from "@/components/organisms/SubcontractorsTab"
import { TechniciansTab } from "@/components/organisms/TechniciansTab"

type MainTab = "subcontractors" | "technicians"

export default function SubcontractorsPage() {
  const t = useTranslations("subcontractors")
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const [user, setUser] = useState<any>(null)
  
  const [activeTab, setActiveTab] = useState<MainTab>("subcontractors")

  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  if (!user) return null

  if (!hasPermission("subcontractor:read")) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 mb-6 group-hover:scale-110 transition-transform duration-500">
              <AlertCircle className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">{t("accessDeniedTitle")}</h1>
            <p className="text-slate-500 max-w-md mb-8">
              {t("accessDeniedDesc")}
            </p>
            <Button 
              onClick={() => router.push("/dashboard")}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 rounded-xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-95"
            >
              {t("returnDashboard")}
            </Button>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex flex-col px-4 pt-4 sm:px-6 sm:pt-5">
              <div className="flex items-center gap-3 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm sm:h-10 sm:w-10">
                  <Wrench className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 sm:text-2xl">{t("title")}</h1>
                  <p className="text-xs text-slate-500">{t("subtitle")}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-6 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab("subcontractors")}
                  className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
                    activeTab === "subcontractors"
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  <Wrench className="h-4 w-4" /> Subcontractors
                </button>
                <button
                  onClick={() => setActiveTab("technicians")}
                  className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
                    activeTab === "technicians"
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  <Users className="h-4 w-4" /> Technicians
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {activeTab === "subcontractors" ? (
               <SubcontractorsTab hasPermission={hasPermission} />
            ) : (
               <TechniciansTab hasPermission={hasPermission} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}