"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { apiFetch } from "@/lib/apiFetch"
import { Button } from "@/components/ui/button"
import type { BuildingDeptRow } from "@/lib/types"
import {
  Landmark, Search, X, ExternalLink, Mail, Phone, Link2,
  Unlink, Loader2, ArrowUpRight, ChevronLeft, ChevronRight,
  AlertCircle,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  job: any
  isReadOnly: boolean
  patch: (updates: Record<string, any>, opts?: { sync_podio?: boolean }) => Promise<void>
  isSaving: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toArr(val: string | string[] | null | undefined): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.filter(Boolean) as string[]
  return [val]
}

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

// ─── Link modal ───────────────────────────────────────────────────────────────

function LinkBldgDeptModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (row: BuildingDeptRow) => Promise<void>
}) {
  const LIMIT = 10
  const [query, setQuery] = useState("")
  const debouncedQ = useDebounce(query, 300)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<BuildingDeptRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total])

  // Reset on open
  useEffect(() => {
    if (!open) return
    setQuery("")
    setPage(1)
  }, [open])

  // Reset page on search change
  useEffect(() => {
    setPage(1)
  }, [debouncedQ])

  // Fetch
  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({ mode: "table", limit: String(LIMIT), page: String(page) })
    if (debouncedQ) params.set("q", debouncedQ)

    apiFetch(`/api/bldg_dept?${params}`, { cache: "no-store", signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        setRows(data?.results ?? [])
        setTotal(Number(data?.total ?? 0))
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => ctrl.abort()
  }, [open, debouncedQ, page])

  const handleSelect = useCallback(
    async (row: BuildingDeptRow) => {
      setLinking(row.ID_BldgDept)
      try {
        await onSelect(row)
        onClose()
      } finally {
        setLinking(null)
      }
    },
    [onSelect, onClose],
  )

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "calc(100vh - 48px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 flex-shrink-0">
              <Landmark className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Link Building Department</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a department to link to this job
                {total > 0 && (
                  <span className="ml-1.5 font-semibold text-slate-500">· {total} total</span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="flex-shrink-0 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              placeholder="Search by city, location, ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col h-48 items-center justify-center gap-3">
              <AlertCircle className="h-8 w-8 text-slate-200" />
              <p className="text-sm text-slate-400">No building departments found</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {rows.map((row) => {
                const isLinking = linking === row.ID_BldgDept
                const emails = toArr(row.Office_Email)
                const phones = toArr(row.Phone)
                return (
                  <li key={row.ID_BldgDept} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                      <Landmark className="h-4 w-4 text-blue-600" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {row.City_BldgDept ?? row.ID_BldgDept}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        {row.Location && (
                          <span className="text-xs text-slate-400 truncate">{row.Location}</span>
                        )}
                        {emails.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Mail className="h-3 w-3" />
                            {emails[0]}
                            {emails.length > 1 && <span>+{emails.length - 1}</span>}
                          </span>
                        )}
                        {phones.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Phone className="h-3 w-3" />
                            {phones[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
                      {row.ID_BldgDept}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleSelect(row)}
                      disabled={linking !== null}
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        isLinking
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      }`}
                    >
                      {isLinking ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Linking…</>
                      ) : (
                        <><Link2 className="h-3.5 w-3.5" /> Link</>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400">
            Showing{" "}
            <span className="font-semibold text-slate-600">{rows.length}</span> of{" "}
            <span className="font-semibold text-slate-600">{total}</span> departments
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => clamp(p - 1, 1, totalPages))}
              disabled={page <= 1 || loading}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => clamp(p + 1, 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    typeof document !== "undefined" ? document.body : (null as any),
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BuildingDeptSection({ job, isReadOnly, patch, isSaving }: Props) {
  const dept = job?.building_dept ?? null
  const linkedId: string | null = job?.ID_BldgDept ?? dept?.ID_BldgDept ?? null

  const [modalOpen, setModalOpen] = useState(false)
  const [linking, setLinking] = useState(false)

  const handleLink = useCallback(
    async (row: BuildingDeptRow) => {
      setLinking(true)
      try {
        await patch({ ID_BldgDept: row.ID_BldgDept }, { sync_podio: false })
      } finally {
        setLinking(false)
      }
    },
    [patch],
  )

  const handleUnlink = useCallback(async () => {
    setLinking(true)
    try {
      await patch({ ID_BldgDept: null }, { sync_podio: false })
    } finally {
      setLinking(false)
    }
  }, [patch])

  const emails = toArr(dept?.Office_Email)
  const phones = toArr(dept?.Phone)

  // ── Linked: show dept info ────────────────────────────────────────────────
  if (linkedId && dept) {
    return (
      <div className="rounded-2xl border border-blue-100 bg-blue-50/40 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <Landmark className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700">
              Building Department
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <Link href={`/building-departments/${dept.ID_BldgDept}`} target="_blank">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-blue-600 hover:bg-blue-100"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                View dept
              </Button>
            </Link>
            {dept.Link && (
              <a href={dept.Link} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-slate-600 hover:bg-white"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Portal
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            )}
            {!isReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                disabled={linking || isSaving}
                onClick={handleUnlink}
                className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                {linking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unlink className="h-3.5 w-3.5" />
                )}
                Unlink
              </Button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-slate-900">
                {dept.City_BldgDept ?? dept.ID_BldgDept}
              </p>
              {dept.Location && (
                <p className="mt-0.5 text-xs text-slate-500">{dept.Location}</p>
              )}
            </div>
            <span className="flex-shrink-0 rounded-md bg-white border border-slate-200 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
              {dept.ID_BldgDept}
            </span>
          </div>

          {(emails.length > 0 || phones.length > 0) && (
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {emails.length > 0 && (
                <a
                  href={`mailto:${emails[0]}`}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {emails[0]}
                  {emails.length > 1 && (
                    <span className="text-slate-400">+{emails.length - 1}</span>
                  )}
                </a>
              )}
              {phones.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {phones[0]}
                  {phones.length > 1 && (
                    <span className="text-slate-400">+{phones.length - 1}</span>
                  )}
                </span>
              )}
            </div>
          )}

          {dept.Portal_Log_In && (
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-600">Login:</span>{" "}
              {dept.Portal_Log_In}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Linked ID only (dept object not loaded yet) ───────────────────────────
  if (linkedId && !dept) {
    return (
      <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <Landmark className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                Building Department
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-slate-700">
                {linkedId}
              </p>
            </div>
          </div>
          <Link href={`/building-departments/${linkedId}`} target="_blank">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-blue-600 hover:bg-blue-100"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              View dept
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // ── No dept linked ────────────────────────────────────────────────────────
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
              <Landmark className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Building Department
            </h3>
          </div>
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="h-7 gap-1.5 rounded-lg border-slate-200 px-2.5 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600"
            >
              <Search className="h-3.5 w-3.5" />
              Link department
            </Button>
          )}
        </div>

        <div className="p-5">
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Landmark className="h-5 w-5 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">No building department linked</p>
            {isReadOnly && (
              <p className="text-xs text-slate-300">Edit the job to link a building department</p>
            )}
          </div>
        </div>
      </div>

      <LinkBldgDeptModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleLink}
      />
    </>
  )
}
