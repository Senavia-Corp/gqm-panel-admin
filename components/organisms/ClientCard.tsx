"use client"

import { Badge } from "@/components/ui/badge"
import type { Client } from "@/lib/types"
import { Mail, Phone, MapPin, BadgeCheck, Building2, User as UserIcon, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTranslations } from "@/components/providers/LocaleProvider"

// ── Components ───────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  iconBg = "bg-slate-100",
  iconColor = "text-slate-500",
  title,
  children,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconBg?: string
  iconColor?: string
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/30">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function FieldLabel({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </label>
  )
}

function ReadonlyField({ value, placeholder = "—" }: { value: any; placeholder?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-sm font-medium text-slate-700 min-h-[40px] flex items-center">
      {value || <span className="text-slate-300 italic font-normal">{placeholder}</span>}
    </div>
  )
}

// ── Normalization Helpers ───────────────────────────────────────────────────

function normalizeArrayField(raw: any): string[] {
  if (raw === null || raw === undefined) return []
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  
  let s = String(raw).trim()
  if (!s) return []

  // ONLY split if wrapped in Postgres-style curly braces {}
  if (s.startsWith("{") && s.endsWith("}")) {
    s = s.slice(1, -1)
    // Split by comma taking into account quoted values
    const parts = s.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    return parts
      .map(p => p.trim().replace(/^"|"$/g, ""))
      .filter(Boolean)
  }

  // Handle standard JSON strings if they appear
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    } catch {
      s = s.slice(1, -1)
      const parts = s.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      return parts.map(p => p.trim().replace(/^"|"$/g, "")).filter(Boolean)
    }
  }

  // Otherwise, it's a single value (even if it has commas like an address)
  return [s]
}

interface ClientCardProps {
  client: Client
  title?: string
  isTechnician?: boolean
}

export function ClientCard({ client, title, isTechnician = false }: ClientCardProps) {
  const t = useTranslations("jobs")
  const phones = normalizeArrayField(client.phone)
  const addresses = normalizeArrayField(client.address)
  const emails = normalizeArrayField(client.email)

  return (
    <SectionCard
      icon={Building2}
      iconBg="bg-gqm-green/10"
      iconColor="text-gqm-green-dark"
      title={title ?? t("clientCardTitle")}
      action={
        !isTechnician && (
          <Link href={`/communities/${client.id}`}>
            <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider text-gqm-green-dark hover:bg-gqm-green/10 hover:text-gqm-green-dark transition-all rounded-lg gap-1.5">
              {t("clientCardViewSection")}
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        )
      }
    >
      <div className="flex items-center gap-4 mb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gqm-green/10 text-gqm-green-dark ring-2 ring-gqm-green/20">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 leading-tight">{client.clientCommunity || client.companyName || "Client"}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-[11px] font-bold text-slate-400 uppercase tracking-wider">{client.id}</span>
            <Badge variant="outline" className="text-[10px] font-bold py-0 h-4 rounded-full border-slate-200 text-slate-400 uppercase">{t("clientCardPartner")}</Badge>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        {/* Services */}
        <div>
          <FieldLabel icon={BadgeCheck}>{t("clientCardServices")}</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {client.servicesInterestedIn ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 transition-colors shadow-none text-[11px] font-bold py-1">
                {client.servicesInterestedIn}
              </Badge>
            ) : (
              <span className="text-slate-300 italic text-xs">{t("clientCardNoServices")}</span>
            )}
          </div>
        </div>

        {/* Addresses */}
        <div>
          <FieldLabel icon={MapPin}>{t("clientCardAddresses")}</FieldLabel>
          <div className="space-y-1.5">
            {addresses.length > 0 ? (
              addresses.map((addr, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-200">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="leading-snug">{addr}</span>
                </div>
              ))
            ) : (
              <ReadonlyField value={null} />
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Phones */}
          {!isTechnician && (
            <div>
              <FieldLabel icon={Phone}>{t("clientCardPhones")}</FieldLabel>
              <div className="space-y-1.5">
                {phones.length > 0 ? (
                  phones.map((p, i) => (
                    <a key={i} href={`tel:${p.replace(/\D/g, "")}`} className="flex items-center gap-2.5 rounded-xl border border-blue-50 bg-blue-50/30 px-3 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:underline transition-all">
                      <Phone className="h-3.5 w-3.5" />
                      {p}
                    </a>
                  ))
                ) : (
                  <ReadonlyField value={null} />
                )}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex flex-col">
            <FieldLabel icon={BadgeCheck}>{t("clientCardStatus")}</FieldLabel>
            <div className="flex-1">
              <Badge
                className={`${
                  client.status?.toLowerCase() === "active"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                } h-10 w-full rounded-xl border px-3 text-sm font-bold uppercase shadow-none flex items-center justify-center`}
              >
                {client.status || "—"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Emails */}
        {!isTechnician && (
          <div>
            <FieldLabel icon={Mail}>{t("clientCardEmails")}</FieldLabel>
            <div className="space-y-1.5">
              {emails.length > 0 ? (
                emails.map((e, i) => (
                  <a key={i} href={`mailto:${e}`} className="flex items-center gap-2.5 rounded-xl border border-indigo-50 bg-indigo-50/30 px-3 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 hover:underline transition-all truncate">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{e}</span>
                  </a>
                ))
              ) : (
                <ReadonlyField value={null} />
              )}
            </div>
          </div>
        )}

        {/* Project Managers */}
        {!isTechnician && client.managers && client.managers.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <FieldLabel icon={UserIcon}>{t("clientCardManagers") || "Project Managers"}</FieldLabel>
            <div className="space-y-3 mt-3">
              {client.managers.map((mgr, i) => (
                <div key={mgr.ID_Manager || i} className="group relative rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-gqm-green/30 hover:shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-gqm-green/10 group-hover:text-gqm-green-dark transition-colors">
                        <UserIcon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{mgr.Manager_name}</h4>
                        {mgr.rol && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gqm-green-dark bg-gqm-green/10 px-2 py-0.5 rounded-full">
                            {mgr.rol}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 text-xs">
                    {mgr.Manager_email && (
                      <a href={`mailto:${mgr.Manager_email}`} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 hover:underline transition-colors">
                        <Mail className="h-3.5 w-3.5" />
                        {mgr.Manager_email}
                      </a>
                    )}
                    {mgr.Manager_location && (
                      <div className="flex items-start gap-2 text-slate-400">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span className="leading-tight">{mgr.Manager_location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
