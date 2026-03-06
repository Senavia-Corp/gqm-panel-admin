"use client"

import { useEffect, useRef } from "react"

// ── Types ────────────────────────────────────────────────────────────────────

export interface TLActivityEntry {
  ID_TLActivity: string
  Action: string | null
  Action_datetime: string | null
  Description: string | null
  ID_Jobs: string | null
  ID_Member: string | null
  member?: {
    ID_Member: string
    Member_Name?: string
    avatar?: string
  } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getActionMeta(action: string | null): {
  icon: string
  color: string
  bg: string
  border: string
} {
  const a = (action ?? "").toLowerCase()

  if (a.includes("created"))   return { icon: "✦", color: "#059669", bg: "#F0FDF4", border: "#BBF7D0" }
  if (a.includes("deleted"))   return { icon: "✕", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" }
  if (a.includes("podio"))     return { icon: "⟳", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" }
  if (a.includes("status"))    return { icon: "◈", color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" }
  if (a.includes("updated") || a.includes("synced"))
                               return { icon: "✎", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" }
  // default
  return { icon: "·", color: "#0B2E1E", bg: "#F0FDF4", border: "#D1FAE5" }
}

function formatDatetime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" }
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { date: iso, time: "" }
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  }
}

function parseDescription(desc: string | null): { source: string | null; body: string | null } {
  if (!desc) return { source: null, body: null }
  const parts = desc.split("  |  ")
  const sourcePart = parts.find((p) => p.startsWith("Source:"))
  const bodyParts  = parts.filter((p) => !p.startsWith("Source:"))
  return {
    source: sourcePart ? sourcePart.replace("Source:", "").trim() : null,
    body:   bodyParts.join(" · ") || null,
  }
}

function getInitials(name: string | undefined | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TimelineItemProps {
  entry: TLActivityEntry
  isLast?: boolean
  animationDelay?: number
}

export function TimelineItem({ entry, isLast = false, animationDelay = 0 }: TimelineItemProps) {
  const ref  = useRef<HTMLDivElement>(null)
  const meta = getActionMeta(entry.Action)
  const { date, time } = formatDatetime(entry.Action_datetime)
  const { source, body } = parseDescription(entry.Description)
  const memberName = entry.member?.Member_Name ?? null

  // Staggered fade-in on mount
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = "0"
    el.style.transform = "translateY(6px)"
    const t = setTimeout(() => {
      el.style.transition = "opacity 0.3s ease, transform 0.3s ease"
      el.style.opacity    = "1"
      el.style.transform  = "translateY(0)"
    }, animationDelay)
    return () => clearTimeout(t)
  }, [animationDelay])

  return (
    <div ref={ref} style={{ display: "flex", gap: "10px", position: "relative" }}>

      {/* Left spine */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        {/* Icon dot */}
        <div style={{
          width:        "28px",
          height:       "28px",
          borderRadius: "50%",
          background:   meta.bg,
          border:       `1.5px solid ${meta.border}`,
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          fontSize:     "12px",
          color:        meta.color,
          fontWeight:   700,
          flexShrink:   0,
          zIndex:       1,
        }}>
          {meta.icon}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div style={{
            width:      "1.5px",
            flexGrow:   1,
            minHeight:  "12px",
            background: "linear-gradient(to bottom, #E5E7EB, transparent)",
            margin:     "3px 0",
          }} />
        )}
      </div>

      {/* Content card */}
      <div style={{
        flex:         1,
        background:   "#FAFAFA",
        border:       "1px solid #F3F4F6",
        borderRadius: "10px",
        padding:      "10px 12px",
        marginBottom: isLast ? 0 : "4px",
        transition:   "border-color 0.15s ease",
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = meta.border)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "#F3F4F6")}
      >
        {/* Top row: action + datetime */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
          <span style={{
            fontSize:   "12px",
            fontWeight: 600,
            color:      "#111827",
            lineHeight: 1.3,
          }}>
            {entry.Action ?? "Activity"}
          </span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
            <span style={{ fontSize: "10px", color: "#9CA3AF", whiteSpace: "nowrap" }}>{date}</span>
            <span style={{ fontSize: "10px", color: "#D1D5DB", whiteSpace: "nowrap" }}>{time}</span>
          </div>
        </div>

        {/* Description body */}
        {body && (
          <p style={{ fontSize: "11px", color: "#6B7280", margin: "0 0 6px", lineHeight: 1.4 }}>
            {body}
          </p>
        )}

        {/* Bottom row: member avatar + source badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {/* Member */}
          {memberName ? (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{
                width:        "18px",
                height:       "18px",
                borderRadius: "50%",
                background:   "#0B2E1E",
                color:        "#fff",
                fontSize:     "8px",
                fontWeight:   700,
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                flexShrink:   0,
              }}>
                {getInitials(memberName)}
              </div>
              <span style={{ fontSize: "10px", color: "#374151", fontWeight: 500 }}>
                {memberName}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: "10px", color: "#D1D5DB", fontStyle: "italic" }}>
              Unknown user
            </span>
          )}

          {/* Source badge */}
          {source && (
            <span style={{
              marginLeft:   "auto",
              fontSize:     "9px",
              fontWeight:   600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding:      "2px 6px",
              borderRadius: "4px",
              background:   source === "Podio" ? "#F5F3FF" : "#F0FDF4",
              color:        source === "Podio" ? "#7C3AED" : "#059669",
              border:       `1px solid ${source === "Podio" ? "#DDD6FE" : "#BBF7D0"}`,
            }}>
              {source}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}