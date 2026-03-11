"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Eye, Mail, Phone } from "lucide-react"

export type CommunityClient = {
  ID_Client: string
  Client_Community?: string | null
  Address?: string | null
  Compliance_Partner?: string | null
  Phone_Number?: string | string[] | null
  Email_Address?: string | string[] | null
  Website?: string | null
  podio_item_id?: string | null
  ID_Community_Tracking?: string | null
}

type Props = {
  client: CommunityClient
  onViewDetails?: (clientId: string) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const safeWebsite = (url?: string | null) => {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`
}

/**
 * Parse a Postgres array literal like {"a","b"} OR a plain string OR a JS string[].
 * Returns an array of trimmed, non-empty strings.
 */
function parseArrayField(raw: string | string[] | null | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map((s) => s.trim()).filter(Boolean)

  const trimmed = raw.trim()
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1)
    const items: string[] = []
    let current = ""
    let inQuote = false
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i]
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === "," && !inQuote) { items.push(current.trim()); current = ""; continue }
      current += ch
    }
    if (current.trim()) items.push(current.trim())
    return items.filter(Boolean)
  }

  return [trimmed]
}

// ─── Contact chips ────────────────────────────────────────────────────────────

function ContactChips({
  values,
  icon: Icon,
  linkPrefix,
  emptyLabel,
}: {
  values: string[]
  icon: React.ElementType
  linkPrefix: string
  emptyLabel: string
}) {
  if (values.length === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-slate-300 italic">
        <Icon className="h-3 w-3" />
        {emptyLabel}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v, i) => (
        <a
          key={i}
          href={`${linkPrefix}${v}`}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 hover:border-slate-300 hover:bg-white transition-colors"
          title={v}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon className="h-2.5 w-2.5 flex-shrink-0 text-slate-400" />
          <span className="truncate max-w-[180px]">{v}</span>
        </a>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommunityDetailsCard({ client, onViewDetails }: Props) {
  const website = safeWebsite(client.Website)
  const emails  = parseArrayField(client.Email_Address)
  const phones  = parseArrayField(client.Phone_Number)

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* ── Top row: name + badges + actions ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-slate-800">
              {client.Client_Community ?? (
                <span className="italic text-slate-400 font-normal">Unnamed community</span>
              )}
            </h3>
            {client.Compliance_Partner && (
              <Badge className="bg-gqm-green text-white hover:bg-gqm-green/90 text-[10px]">
                Compliance: {client.Compliance_Partner}
              </Badge>
            )}
          </div>

          {/* ID row */}
          <p className="mt-1 text-xs text-slate-400">
            <span className="font-mono font-semibold text-slate-500 bg-slate-100 rounded px-1 py-0.5">
              {client.ID_Client}
            </span>
            {client.ID_Community_Tracking && (
              <span className="ml-2 text-slate-400">
                · Parent:{" "}
                <span className="font-mono text-slate-500">{client.ID_Community_Tracking}</span>
              </span>
            )}
          </p>

          {/* Address */}
          {client.Address && (
            <p className="mt-1.5 line-clamp-1 text-xs text-slate-500" title={client.Address}>
              📍 {client.Address}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1.5">
          {website ? (
            <a href={website} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <ExternalLink className="h-3.5 w-3.5" />
                Website
              </Button>
            </a>
          ) : (
            <Button variant="outline" size="sm" disabled className="gap-1.5 text-xs h-8 opacity-40">
              <ExternalLink className="h-3.5 w-3.5" />
              Website
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5 bg-gqm-green hover:bg-gqm-green/90 text-xs h-8"
            onClick={() => onViewDetails?.(client.ID_Client)}
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
        </div>
      </div>

      {/* ── Contact chips ── */}
      <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-3">
        <ContactChips
          values={emails}
          icon={Mail}
          linkPrefix="mailto:"
          emptyLabel="No email"
        />
        <ContactChips
          values={phones}
          icon={Phone}
          linkPrefix="tel:"
          emptyLabel="No phone"
        />
      </div>
    </div>
  )
}