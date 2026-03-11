"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MapPin, Trash2, Link2, Users, UserCheck, Building2 } from "lucide-react"
import type { UserRole } from "@/lib/types"

type Props = {
  role: UserRole
  job: any
  onOpenLinkMember?: () => void
  onRequestUnlinkMember?: (payload: { memberId: string; name?: string }) => void
}

// ── Avatar color palette (earthy/construction tones) ──────────────────────
const AVATAR_COLORS = [
  { bg: "bg-emerald-500", ring: "ring-emerald-200", text: "text-emerald-700", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { bg: "bg-sky-500",     ring: "ring-sky-200",     text: "text-sky-700",     badge: "bg-sky-50 text-sky-700 border-sky-200" },
  { bg: "bg-violet-500",  ring: "ring-violet-200",  text: "text-violet-700",  badge: "bg-violet-50 text-violet-700 border-violet-200" },
  { bg: "bg-amber-500",   ring: "ring-amber-200",   text: "text-amber-700",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { bg: "bg-rose-500",    ring: "ring-rose-200",    text: "text-rose-700",    badge: "bg-rose-50 text-rose-700 border-rose-200" },
  { bg: "bg-teal-500",    ring: "ring-teal-200",    text: "text-teal-700",    badge: "bg-teal-50 text-teal-700 border-teal-200" },
  { bg: "bg-indigo-500",  ring: "ring-indigo-200",  text: "text-indigo-700",  badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { bg: "bg-orange-500",  ring: "ring-orange-200",  text: "text-orange-700",  badge: "bg-orange-50 text-orange-700 border-orange-200" },
]

function colorFor(name: string) {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initialsOf(name?: string) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── Contact info row ──────────────────────────────────────────────────────
function ContactRow({
  icon: Icon,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  value?: string
  href?: string
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
      {href ? (
        <a
          href={href}
          className="truncate text-xs text-blue-600 hover:underline"
          title={value}
        >
          {value}
        </a>
      ) : (
        <span className="truncate text-xs text-slate-600" title={value}>
          {value}
        </span>
      )}
    </div>
  )
}

// ── Member card ───────────────────────────────────────────────────────────
function MemberCard({
  member,
  index,
  role,
  onUnlink,
}: {
  member: any
  index: number
  role: UserRole
  onUnlink: () => void
}) {
  const name        = member.Member_Name || member.Acc_Rep || "Unknown"
  const memberId    = member.ID_Member || `member-${index}`
  const companyRole = member.Company_Role || null
  const projectRole = member.rol || member.Rol || null
  const email       = member.Email_Address || member.Email || ""
  const phone       = member.Phone_Number || member.Phone || ""
  const address     = member.Address || ""

  const color = colorFor(String(name))

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      
      {/* Color accent bar */}
      <div className={`h-1 w-full ${color.bg}`} />

      <div className="flex flex-1 flex-col p-5">
        {/* Top: avatar + name + unlink */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ring-2 ${color.bg} ${color.ring}`}
          >
            {initialsOf(name)}
          </div>

          {/* Name + roles */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900" title={name}>
              {name}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-400" title={memberId}>
              {memberId}
            </p>
          </div>

          {/* Unlink button */}
          {role === "GQM_MEMBER" && (
            <button
              onClick={onUnlink}
              className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
              title={`Remove ${name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Badges */}
        {(companyRole || projectRole) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {companyRole && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${color.badge}`}>
                <Building2 className="h-3 w-3" />
                {companyRole}
              </span>
            )}
            {projectRole && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                <UserCheck className="h-3 w-3" />
                {projectRole}
              </span>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="my-3 border-t border-dashed border-slate-100" />

        {/* Contact info */}
        <div className="space-y-1.5">
          <ContactRow icon={Mail}  value={email}   href={email ? `mailto:${email}` : undefined} />
          <ContactRow icon={Phone} value={phone}   href={phone ? `tel:${phone}` : undefined} />
          <ContactRow icon={MapPin} value={address} />
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyState({ onAdd, canAdd }: { onAdd?: () => void; canAdd: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Users className="h-7 w-7" />
      </div>
      <p className="text-sm font-medium text-slate-600">No members assigned yet</p>
      <p className="mt-1 text-xs text-slate-400">Link a team member to get started</p>
      {canAdd && (
        <Button
          onClick={onAdd}
          size="sm"
          className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
          Link Member
        </Button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export function JobMembersTab({ role, job, onOpenLinkMember, onRequestUnlinkMember }: Props) {
  const members = Array.isArray(job?.members) ? job.members : []
  const canManage = role === "GQM_MEMBER"

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Team Members</h3>
            <p className="text-xs text-slate-500">
              {members.length === 0
                ? "No members assigned"
                : `${members.length} member${members.length !== 1 ? "s" : ""} assigned`}
            </p>
          </div>
        </div>

        {canManage && members.length > 0 && (
          <Button
            onClick={onOpenLinkMember}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            Link Member
          </Button>
        )}
      </div>

      {/* Grid or empty */}
      {members.length === 0 ? (
        <EmptyState onAdd={onOpenLinkMember} canAdd={canManage} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member: any, index: number) => {
            const memberId = member.ID_Member || `member-${index}`
            const name     = member.Member_Name || member.Acc_Rep || "Unknown"
            return (
              <MemberCard
                key={memberId}
                member={member}
                index={index}
                role={role}
                onUnlink={() => onRequestUnlinkMember?.({ memberId, name })}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}