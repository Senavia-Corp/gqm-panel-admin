"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { apiFetch } from "@/lib/apiFetch"
import {
  Store, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Globe, Mail, Phone, ExternalLink, Loader2, AlertCircle, X,
} from "lucide-react"

const SPECIALTIES = [
  "Doors", "Windows/Glazing", "Plumbing Materials", "Fencing",
  "Landscaping Supplies", "Tile/Flooring", "Stones/Masonry", "Rental Equip",
  "Electrical Materials", "HVAC Materials", "Paint Suppliers", "Roll Up Doors",
  "Kitchen Cabinets", "Roofing Materials", "Glass/Mirrors", "Construction Supplies",
  "Bathroom Supplies", "Gutters / Screens",
]

type SupplierEntry = {
  ID_Supplier: string
  Company_Name: string | null
  Speciality: string | null
  Coverage_Area: string | null
  Email_Address: string | null
  Phone_Number: string | null
  Company_Website: string | null
  Acc_Status: string | null
}

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return d
}

function safeUrl(url?: string | null) {
  if (!url) return null
  const t = url.trim()
  if (!t) return null
  return t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`
}

const LIMIT = 5

export function SupplierBrowserPanel() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [specialty, setSpecialty] = useState("")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<SupplierEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const dq = useDebounce(q, 350)

  const fetch_ = useCallback(async (p: number, search: string, spec: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      const effectiveQ = spec || search
      if (effectiveQ) params.set("q", effectiveQ)
      const res = await apiFetch(`/api/supplier?${params}`, {
        signal: abortRef.current.signal,
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setRows(data.results ?? [])
      setTotal(data.total ?? 0)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError("Failed to load suppliers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { setPage(1) }, [dq, specialty])

  useEffect(() => {
    if (open) fetch_(page, dq, specialty)
  }, [open, page, dq, specialty, fetch_])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2.5 px-5 py-3.5 text-left transition-colors hover:bg-violet-50/60 bg-violet-50/40 border-b border-violet-100"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100">
          <Store className="h-3.5 w-3.5 text-violet-600" />
        </div>
        <p className="flex-1 text-xs font-bold uppercase tracking-wide text-violet-700">
          Supplier Directory
        </p>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
        }
      </button>

      {open && (
        <div>
          {/* Search + specialty filter */}
          <div className="space-y-2 px-4 py-3 border-b border-slate-50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                value={q}
                onChange={e => { setQ(e.target.value); setSpecialty("") }}
                placeholder="Search name, email, coverage…"
                className="w-full pl-8 pr-7 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-violet-400 focus:bg-white"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <select
              value={specialty}
              onChange={e => { setSpecialty(e.target.value); setQ("") }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-violet-400 focus:bg-white"
            >
              <option value="">All specialties</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-[11px] text-slate-400">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-[11px] text-slate-400">No suppliers found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {rows.map(s => {
                const websiteUrl = safeUrl(s.Company_Website)
                return (
                  <div key={s.ID_Supplier} className="px-4 py-3 space-y-1.5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">
                        {s.Company_Name ?? "—"}
                      </p>
                      {s.Acc_Status === "Active" && (
                        <span className="flex-shrink-0 text-[10px] font-semibold text-emerald-600">Active</span>
                      )}
                      {s.Acc_Status === "Inactive" && (
                        <span className="flex-shrink-0 text-[10px] font-semibold text-slate-400">Inactive</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {s.Speciality && (
                        <span className="inline-flex items-center rounded-md bg-violet-50 border border-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                          {s.Speciality}
                        </span>
                      )}
                      {s.Coverage_Area && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {s.Coverage_Area}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 pt-0.5">
                      {s.Email_Address && (
                        <a
                          href={`mailto:${s.Email_Address}`}
                          className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 hover:underline min-w-0"
                        >
                          <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="truncate">{s.Email_Address}</span>
                        </a>
                      )}
                      {s.Phone_Number && (
                        <a
                          href={`tel:${s.Phone_Number}`}
                          className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-700"
                        >
                          <Phone className="h-2.5 w-2.5 flex-shrink-0" />
                          {s.Phone_Number}
                        </a>
                      )}
                      {websiteUrl && (
                        <a
                          href={websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] text-violet-600 hover:underline"
                        >
                          <Globe className="h-2.5 w-2.5 flex-shrink-0" />
                          Website
                          <ExternalLink className="h-2 w-2 flex-shrink-0" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && total > 0 && (
            <div className="flex items-center justify-between border-t border-slate-50 px-4 py-2.5">
              <span className="text-[10px] text-slate-400">
                {total} supplier{total !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(p => p - 1)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span className="text-[10px] font-semibold text-slate-500 min-w-[28px] text-center">
                  {page}/{totalPages}
                </span>
                <button
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(p => p + 1)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
