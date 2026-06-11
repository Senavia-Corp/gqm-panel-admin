"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { User, Search, X, Loader2, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms = 300): T {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return deb
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LinkTechnicianModalProps {
  open: boolean
  onClose: () => void
  onLink: (techId: string) => Promise<void>
  excludeIds: string[]
}

export function LinkTechnicianModal({ open, onClose, onLink, excludeIds }: LinkTechnicianModalProps) {
  const LIMIT = 10
  const [query, setQuery] = useState("")
  const dQ = useDebounce(query, 300)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  useEffect(() => { if (open) { setQuery(""); setPage(1) } }, [open])
  useEffect(() => { setPage(1) }, [dQ])

  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (dQ) params.set("q", dQ)
    apiFetch(`/api/technician?${params}`, { cache: "no-store", signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => { setRows(d.results ?? []); setTotal(Number(d.total ?? 0)) })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [open, dQ, page])

  if (!open) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "calc(100vh - 48px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <User className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Link Technician</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {total > 0 ? `Showing ${total} technicians available` : "Select a technician to link"}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-shrink-0 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search technicians..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
          ) : rows.length === 0 ? (
            <div className="flex h-40 items-center justify-center"><p className="text-sm text-slate-400">No technicians found.</p></div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {rows.map((tech) => {
                const alreadyLinked = excludeIds.includes(tech.ID_Technician)
                const isLinking = linking === tech.ID_Technician
                const display = tech.Email_Address || tech.ID_Technician
                return (
                  <li key={tech.ID_Technician} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 text-sm font-bold">
                      {String(tech.Name ?? "?")[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{tech.Name || "—"}</p>
                      <p className="text-xs text-slate-400 truncate">{display}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
                      {tech.ID_Technician}
                    </span>
                    <button
                      type="button"
                      disabled={alreadyLinked || linking !== null}
                      onClick={async () => {
                        setLinking(tech.ID_Technician)
                        await onLink(tech.ID_Technician)
                        setLinking(null)
                      }}
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        alreadyLinked
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : isLinking
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                      }`}
                    >
                      {isLinking
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Linking...</>
                        : alreadyLinked
                        ? "Linked"
                        : <><Plus className="h-3.5 w-3.5" /> Add</>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400">
            Showing {rows.length} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((p) => clamp(p - 1, 1, totalPages))} disabled={page <= 1 || loading} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-600">{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => clamp(p + 1, 1, totalPages))} disabled={page >= totalPages || loading} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
