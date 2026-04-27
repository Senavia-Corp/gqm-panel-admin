"use client"

import { Eye, Trash2, Mail, Building2, Hash, Star, ShieldCheck, Wrench, MapPin, AlertCircle } from "lucide-react"
import type { Subcontractor } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { useTranslations } from "@/components/providers/LocaleProvider"
import Link from "next/link"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseEmailField(raw: string | null | undefined): string[] {
  if (!raw) return []
  const t = raw.trim()
  if (t.startsWith("{") && t.endsWith("}")) {
    const inner = t.slice(1, -1)
    const items: string[] = []
    let cur = "", inQ = false
    for (const ch of inner) {
      if (ch === '"') { inQ = !inQ; continue }
      if (ch === "," && !inQ) { items.push(cur.trim()); cur = ""; continue }
      cur += ch
    }
    if (cur.trim()) items.push(cur.trim())
    return items.filter(Boolean)
  }
  return t ? [t] : []
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string | null }) {
  const t = useTranslations("subcontractors")
  if (!status) return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400 italic">
      <AlertCircle className="h-2.5 w-2.5" /> {t("noStatus")}
    </span>
  )
  const map: Record<string, string> = {
    active:   "bg-emerald-100 text-emerald-700 border-emerald-200",
    inactive: "bg-slate-100 text-slate-500 border-slate-200",
    pending:  "bg-yellow-100 text-yellow-700 border-yellow-200",
    banned:   "bg-red-100 text-red-600 border-red-200",
  }
  const cls = map[status.toLowerCase()] ?? "bg-blue-100 text-blue-700 border-blue-200"
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {t(status.toLowerCase() as any)}
    </span>
  )
}

function ScoreBadge({ score }: { score?: number | null }) {
  const t = useTranslations("subcontractors")
  if (score == null) return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400 italic">
      <Star className="h-2.5 w-2.5" /> {t("noScore")}
    </span>
  )
  const pct = Math.min(100, Math.max(0, score))
  const cls =
    pct >= 80 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    pct >= 50 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                "bg-red-100 text-red-600 border-red-200"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      <Star className="h-2.5 w-2.5 fill-current" />
      {pct % 1 === 0 ? pct : pct.toFixed(1)}
    </span>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function SubcAvatar({ name }: { name?: string | null }) {
  const initials = (name ?? "??").slice(0, 2).toUpperCase()
  const COLORS = [
    ["#ECFDF5", "#059669"], ["#EFF6FF", "#2563EB"], ["#FFF7ED", "#EA580C"],
    ["#F5F3FF", "#7C3AED"], ["#FEF2F2", "#DC2626"], ["#F0FDF4", "#16A34A"],
    ["#FFF1F2", "#E11D48"], ["#F0F9FF", "#0284C7"],
  ]
  const [bg, fg] = COLORS[(initials.charCodeAt(0) ?? 0) % COLORS.length]
  return (
    <div style={{ background: bg, color: fg }}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-black">
      {initials}
    </div>
  )
}

// ─── Email cell ───────────────────────────────────────────────────────────────

function EmailCell({ raw }: { raw?: string | null }) {
  const emails = parseEmailField(raw)
  if (!emails.length) return (
    <span className="flex items-center gap-1 text-xs italic text-slate-300">
      <Mail className="h-3 w-3 flex-shrink-0" /> {useTranslations("subcontractors")("noEmail")}
    </span>
  )
  return (
    <div className="flex flex-col gap-0.5">
      {emails.map((e, i) => (
        <a key={i} href={`mailto:${e}`}
          className="flex items-center gap-1 min-w-0 text-xs text-emerald-700 hover:underline">
          <Mail className="h-3 w-3 flex-shrink-0 text-slate-400" />
          <span className="truncate max-w-[200px]" title={e}>{e}</span>
        </a>
      ))}
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

interface Props {
  subcontractors: Subcontractor[]
  onDelete?: (s: Subcontractor) => void
}

export function SubcontractorManagementTable({ subcontractors, onDelete }: Props) {
  const t = useTranslations("subcontractors")
  if (subcontractors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-16">
        <Wrench className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">{t("noSubsFound")}</p>
        <p className="text-xs text-slate-400">{t("tryAdjusting")}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            {[
              { icon: Hash,       label: t("items") },
              { icon: Building2,  label: t("title") },
              { icon: Building2,  label: t("organization") },
              { icon: ShieldCheck,label: t("status") },
              { icon: Mail,       label: t("email") },
              { icon: Star,       label: t("score") },
            ].map(({ icon: Icon, label }) => (
              <th key={label} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 first:pl-5">
                <span className="flex items-center gap-1"><Icon className="h-3 w-3" />{label}</span>
              </th>
            ))}
            <th className="py-3 pl-3 pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t("actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {subcontractors.map((s) => (
            <tr key={s.ID_Subcontractor} className="group transition-colors hover:bg-slate-50/60">
              {/* ID */}
              <td className="py-3.5 pl-5 pr-3">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-500">
                  {s.ID_Subcontractor}
                </span>
              </td>

              {/* Name + specialty */}
              <td className="px-3 py-3.5">
                <div className="flex items-center gap-2.5">
                  <SubcAvatar name={s.Name} />
                  <div className="min-w-0">
                    <p className="max-w-[160px] truncate text-sm font-semibold text-slate-800">
                      {s.Name ?? <span className="font-normal italic text-slate-300">{t("unnamed")}</span>}
                    </p>
                    {s.Specialty ? (
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                        <Wrench className="h-2.5 w-2.5 text-slate-400" />{s.Specialty}
                      </span>
                    ) : (
                      <span className="mt-0.5 text-[11px] italic text-slate-300">{t("noSpecialty")}</span>
                    )}
                  </div>
                </div>
              </td>

              {/* Organization */}
              <td className="px-3 py-3.5">
                {s.Organization ? (
                  <span className="flex items-center gap-1 text-xs text-slate-700">
                    <Building2 className="h-3 w-3 flex-shrink-0 text-slate-400" />
                    <span className="max-w-[140px] truncate" title={s.Organization}>{s.Organization}</span>
                  </span>
                ) : (
                  <span className="text-xs italic text-slate-300">{t("noOrganization")}</span>
                )}
              </td>

              {/* Status */}
              <td className="px-3 py-3.5">
                <StatusBadge status={s.Status} />
              </td>

              {/* Email */}
              <td className="px-3 py-3.5">
                <EmailCell raw={s.Email_Address} />
              </td>

              {/* Score */}
              <td className="px-3 py-3.5">
                <ScoreBadge score={s.Score} />
              </td>

              {/* Actions */}
              <td className="py-3.5 pl-3 pr-5 text-right">
                <div className="flex justify-end gap-1.5">
                  <Link href={`/subcontractors/${s.ID_Subcontractor}`}>
                    <Button variant="ghost" size="icon"
                      className="h-8 w-8 rounded-lg bg-amber-500 text-white shadow-sm hover:bg-amber-600"
                      title={t("viewDetails")}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon"
                    className="h-8 w-8 rounded-lg bg-slate-800 text-white shadow-sm transition-colors hover:bg-red-600"
                    onClick={() => onDelete?.(s)}
                    title={t("delete")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}