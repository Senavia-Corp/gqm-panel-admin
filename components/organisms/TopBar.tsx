"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, ChevronDown, Loader2, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/apiFetch"
import { LanguageToggle } from "@/components/atoms/LanguageToggle"
import { Logo } from "@/components/atoms/Logo"
import { useSidebar } from "@/components/providers/SidebarContext"
import { useQuery } from "@tanstack/react-query"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberInfo {
  Member_Name: string | null
  Company_Role: string | null
  Email_Address: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getAvatarColor(name: string | null | undefined): { bg: string; text: string } {
  const PALETTES = [
    { bg: "bg-emerald-500", text: "text-white" },
    { bg: "bg-violet-500",  text: "text-white" },
    { bg: "bg-sky-500",     text: "text-white" },
    { bg: "bg-amber-500",   text: "text-white" },
    { bg: "bg-rose-500",    text: "text-white" },
    { bg: "bg-teal-500",    text: "text-white" },
  ]
  if (!name) return PALETTES[0]
  const idx = name.charCodeAt(0) % PALETTES.length
  return PALETTES[idx]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TopBar({ user: _user }: { user?: any } = {}) {
  const [localData, setLocalData] = useState<{ id: string | null; roleType: "tech" | "member" | "subc"; initialMember: MemberInfo | null }>({ id: null, roleType: "member", initialMember: null })
  const [notifCount] = useState(3) // placeholder — wire up to real notif system when ready
  const router = useRouter()
  const { setIsOpen } = useSidebar()

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user_data")
      const ud = raw ? JSON.parse(raw) : null
      if (ud) {
        const userRole = ud.role || localStorage.getItem("user_type") || ud.user_type
        const isTech = userRole === "LEAD_TECHNICIAN" || userRole === "technician"
        const isSubc = userRole === "SUBCONTRACTOR" || userRole === "subcontractor"
        const roleType = isTech ? "tech" : isSubc ? "subc" : "member"
        const memberId = ud.id || ud.user_id || localStorage.getItem("user_id") || ud.ID_Member || ud.ID_Technician || ud.ID_Subcontractor
        
        setLocalData({
          id: memberId,
          roleType,
          initialMember: {
            Member_Name:   ud.Name ?? ud.name ?? ud.Member_Name ?? ud.Organization ?? null,
            // Nunca ud.role: es la etiqueta de sesión («FULL_ADMIN»), no un
            // cargo. Ponerla aquí es lo que imprimía «GQM_MEMBER» bajo el nombre.
            Company_Role:  ud.Type_of_technician ?? ud.type_of_technician ?? ud.companyRole ?? ud.Company_Role ?? (roleType === "tech" ? "Technician" : roleType === "subc" ? "Subcontractor" : "Member"),
            Email_Address: ud.Email_Address ?? ud.email ?? null,
          }
        })
      }
    } catch {}
  }, [])

  const { data: member, isLoading: queryLoading } = useQuery({
    queryKey: ["topbar-member", localData.id, localData.roleType],
    queryFn: async () => {
      const endpoint = localData.roleType === "tech" ? `/api/technician/${localData.id}` : localData.roleType === "subc" ? `/api/subcontractors/${localData.id}` : `/api/members/${localData.id}`
      const res = await apiFetch(endpoint)
      if (!res.ok) throw new Error("Failed to load user info")
      const data = await res.json()
      return {
        Member_Name:   data.Name ?? data.name ?? data.Member_Name ?? data.Organization ?? null,
        Company_Role:  data.Type_of_technician ?? data.type_of_technician ?? data.Company_Role ?? data.Role_in_Company ?? (localData.roleType === "tech" ? "Technician" : localData.roleType === "subc" ? "Subcontractor" : "Member"),
        Email_Address: data.Email_Address ?? data.Email ?? data.email ?? null,
      } as MemberInfo
    },
    enabled: !!localData.id,
    initialData: localData.initialMember || undefined,
    // Sin esto, initialData nace con dataUpdatedAt = ahora y el staleTime de 5
    // min impide la primera lectura real: la cabecera se quedaba con lo que
    // hubiera en localStorage aunque estuviera obsoleto.
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60 * 1000
  })

  const loadingMember = !member && queryLoading

  const initials   = getInitials(member?.Member_Name)
  const avatarCols = getAvatarColor(member?.Member_Name)
  const displayName = member?.Member_Name ?? "GQM User"
  const displayRole = member?.Company_Role ?? "Member"

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] md:h-16 md:px-6">

      {/* ── Left: hamburger (mobile) + branding ── */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Hamburger — mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo — mobile only (replaces branding text) */}
        <div className="lg:hidden">
          <Logo showText={false} />
        </div>

        {/* Branding accent — desktop only */}
        <div className="hidden items-center gap-3 lg:flex">
          <div className="h-6 w-0.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            GQM Dashboard
          </span>
        </div>
      </div>

      {/* ── Right: actions + user ── */}
      <div className="flex items-center gap-1.5 md:gap-2">

        {/* Notifications */}
        {/* <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell className="h-[18px] w-[18px]" />
          {notifCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </Button> */}

        {/* Language toggle */}
        <LanguageToggle />

        {/* Divider */}
        <div className="mx-0.5 h-6 w-px bg-slate-200 md:mx-1" />

        {/* User pill */}
        <button
          onClick={() => router.push("/profile")}
          className="group flex items-center gap-2 rounded-xl border border-transparent px-1.5 py-1.5 transition-all hover:border-slate-200 hover:bg-slate-50 md:gap-3 md:px-2">
          {/* Avatar */}
          {loadingMember ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 md:h-9 md:w-9">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : (
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-xs font-black tracking-tight shadow-sm md:h-9 md:w-9 md:text-sm
                ${avatarCols.bg} ${avatarCols.text}`}
            >
              {initials}
            </div>
          )}

          {/* Name + role — hidden on mobile */}
          <div className="hidden flex-col items-start leading-none md:flex">
            {loadingMember ? (
              <div className="space-y-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-2.5 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            ) : (
              <>
                <span className="text-[13px] font-semibold text-slate-800">{displayName}</span>
                <span className="mt-0.5 text-[11px] text-slate-400">{displayRole}</span>
              </>
            )}
          </div>

          <ChevronDown className="ml-0.5 hidden h-3.5 w-3.5 text-slate-300 transition-transform group-hover:text-slate-500 md:block md:ml-1" />
        </button>
      </div>
    </header>
  )
}