"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/apiFetch"
import { LanguageToggle } from "@/components/atoms/LanguageToggle"

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

export function TopBar() {
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [loadingMember, setLoadingMember] = useState(true)
  const [notifCount] = useState(3) // placeholder — wire up to real notif system when ready
  const router = useRouter()

  useEffect(() => {
    const memberId =
      localStorage.getItem("user_id") ??
      (() => {
        try {
          const ud = localStorage.getItem("user_data")
          return ud ? JSON.parse(ud)?.id ?? null : null
        } catch { return null }
      })()

    if (!memberId) { setLoadingMember(false); return }

    apiFetch(`/api/members/${memberId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        setMember({
          Member_Name:   data.Member_Name   ?? null,
          Company_Role:  data.Company_Role  ?? null,
          Email_Address: data.Email_Address ?? null,
        })
      })
      .catch((err) => console.warn("[TopBar] could not load member:", err))
      .finally(() => setLoadingMember(false))
  }, [])

  const initials   = getInitials(member?.Member_Name)
  const avatarCols = getAvatarColor(member?.Member_Name)
  const displayName = member?.Member_Name ?? "GQM User"
  const displayRole = member?.Company_Role ?? "Member"

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

      {/* ── Left: branding accent line ── */}
      <div className="flex items-center gap-3">
        <div className="h-6 w-0.5 rounded-full bg-emerald-500" />
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          GQM Dashboard
        </span>
      </div>

      {/* ── Right: actions + user ── */}
      <div className="flex items-center gap-2">

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
        <div className="mx-1 h-6 w-px bg-slate-200" />

        {/* User pill */}
        <button
          onClick={() => router.push("/profile")}
          className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 transition-all hover:border-slate-200 hover:bg-slate-50">
          {/* Avatar */}
          {loadingMember ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : (
            <div
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black tracking-tight shadow-sm
                ${avatarCols.bg} ${avatarCols.text}`}
            >
              {initials}
            </div>
          )}

          {/* Name + role */}
          <div className="flex flex-col items-start leading-none">
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

          <ChevronDown className="ml-1 h-3.5 w-3.5 text-slate-300 transition-transform group-hover:text-slate-500" />
        </button>
      </div>
    </header>
  )
}