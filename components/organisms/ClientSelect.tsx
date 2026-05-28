"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { Building2, Search, X, ChevronLeft, ChevronRight, RefreshCcw, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/apiFetch"
import { useTranslations } from "@/components/providers/LocaleProvider"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientTableRow {
  ID_Client: string
  Client_Community: string | null
  Address: string | null
  Email_Address: string | string[] | null
  Phone_Number: string | string[] | null
  Client_Status: string | null
  Compliance_Partner: string | null
  ID_Community_Tracking: string | null
  podio_item_id: string | null
}

interface TableResponse {
  page: number
  limit: number
  total: number
  results: ClientTableRow[]
}

interface MappedClient {
  id: string
  name: string
  companyName?: string
  email?: string
  phone?: string
  address?: string
  avatar?: string
  status?: string
}

interface Props {
  value?: string
  onChange: (client: MappedClient | null) => void
  initialClients?: any[]
  changed?: boolean
  disabled?: boolean
  syncPodio?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEmail(raw: string | string[] | null | undefined): string {
  if (!raw) return ""
  return Array.isArray(raw) ? (raw[0] ?? "") : raw
}

function mapRow(c: ClientTableRow): MappedClient {
  return {
    id: c.ID_Client,
    name: c.Client_Community ?? c.ID_Client,
    companyName: c.ID_Community_Tracking ?? undefined,
    email: getEmail(c.Email_Address),
    phone: getEmail(c.Phone_Number as any),
    address: c.Address ?? undefined,
    status: c.Client_Status ?? undefined,
    avatar: "/placeholder.svg?height=80&width=80",
  }
}

const STATUS_COLORS: Record<string, string> = {
  Active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  Inactive: "bg-slate-100 text-slate-500 border-slate-200",
  Prospect: "bg-amber-50 text-amber-700 border-amber-200",
}

// ─── Hook: debounced fetch from /api/clients/table ────────────────────────────

function useClientTable(enabled: boolean) {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  // Debounce logic
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const { data, isLoading, isFetching } = useQuery<TableResponse>({
    queryKey: ["clients_table", debouncedQuery, page],
    queryFn: async () => {
      const q = debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ""
      const res = await apiFetch(`/api/clients/table?page=${page}&limit=8${q}`)
      if (!res.ok) throw new Error("Failed to fetch clients table")
      return await res.json()
    },
    enabled: enabled,
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  })

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  return {
    query, setQuery,
    page, setPage,
    data: data || null, 
    loading: isLoading || isFetching,
    error: null,
    totalPages,
    refetch: () => {},
  }
}

// ─── Hook: load a single client by id (for display when not in current page) ─

function useSingleClient(id: string | undefined) {
  const { data: client } = useQuery<ClientTableRow | null>({
    queryKey: ["client_single", id],
    queryFn: async () => {
      if (!id) return null
      
      const res = await apiFetch(`/api/clients/table?q=${encodeURIComponent(id)}&limit=1`, { cache: "no-store" })
      if (res.ok) {
        const json: TableResponse = await res.json()
        const found = json.results.find((r) => r.ID_Client === id)
        if (found) return found
      }
      
      // Fallback
      const res2 = await apiFetch(`/api/clients/${encodeURIComponent(id)}`, { cache: "no-store" })
      if (!res2.ok) return null
      return await res2.json()
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  })

  return client ?? null
}

// ─── Main Component ────────────────────────────────────────────────────────

export function ClientSelect({ value, onChange, initialClients = [], changed, disabled = false, syncPodio = false }: Props) {
  const t = useTranslations("jobs")
  const tCommon = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [pendingClient, setPendingClient] = useState<ClientTableRow | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const table = useClientTable(open)
  const foundInitial = initialClients.find((c) => c.ID_Client === value)
  const singleClient = useSingleClient(value && !foundInitial && !table.data?.results.some(r => r.ID_Client === value) ? value : undefined)

  // Find selected client in current results or fallback
  const selectedRow = table.data?.results.find(r => r.ID_Client === value)
    ?? foundInitial
    ?? (singleClient?.ID_Client === value ? singleClient : null)

  const selectedMapped = selectedRow ? mapRow(selectedRow) : null

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    // Small delay to avoid immediate close on open
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 100)
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler) }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open])

  const handleSelect = (row: ClientTableRow) => {
    onChange(mapRow(row))
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  // ── Trigger button ──────────────────────────────────────────────────────
  const trigger = (
    <div
      ref={triggerRef}
      role="button"
      tabIndex={0}
      onClick={() => setOpen(true)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true) } }}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
        changed
          ? "border-amber-400 bg-amber-50/40 ring-1 ring-amber-300"
          : "border-slate-200 bg-slate-50 hover:bg-white"
      }`}
    >
      {selectedMapped ? (
        <>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-800">{selectedMapped.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[10px] text-slate-400">{selectedMapped.id}</span>
              {selectedMapped.status && (
                <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[selectedMapped.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
                  {selectedMapped.status}
                </span>
              )}
            </div>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClear(e as any) } }}
            className="flex-shrink-0 cursor-pointer rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors"
            title={t("clientClearSelection")}
          >
            <X className="h-3.5 w-3.5" />
          </div>
        </>
      ) : (
        <>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="text-sm text-slate-400">{t("clientSelectPlaceholder")}</span>
        </>
      )}
    </div>
  )

  // ── Disabled / read-only display ────────────────────────────────────────
  if (disabled) {
    return (
      <div className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 opacity-70 cursor-not-allowed">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
          <Building2 className="h-4 w-4" />
        </div>
        {selectedMapped ? (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-600">{selectedMapped.name}</div>
            <div className="font-mono text-[10px] text-slate-400">{selectedMapped.id}</div>
          </div>
        ) : (
          <span className="text-sm text-slate-400">{t("clientNoSelected")}</span>
        )}
      </div>
    )
  }

  // ── Modal (portal, centered on screen) ─────────────────────────────────
  const modal = open && typeof window !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-lg mx-4 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        {pendingClient ? (
          <div className="flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800 mb-2">Cliente no en Podio</h3>
            <p className="text-center text-sm text-slate-500 mb-6">
              Este trabajo tiene activada la sincronización con Podio, pero el cliente seleccionado no se encuentra registrado en Podio.
              <br /><br />
              Por lo tanto, el sistema <b>no podrá vincular</b> a este cliente en el registro de Podio, y solo quedará guardado de manera local. ¿Deseas continuar?
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingClient(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors w-full sm:w-auto"
              >
                Elegir otro
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSelect(pendingClient)
                  setPendingClient(null)
                }}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors shadow-sm w-full sm:w-auto"
              >
                Aceptar (Solo Local)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <Building2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{t("clientModalTitle")}</h3>
              {table.data && (
                <p className="text-[11px] text-slate-400">{table.data.total} {t("clientsAvailableSuffix")}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              placeholder={t("clientSearchPlaceholder")}
              value={table.query}
              onChange={(e) => table.setQuery(e.target.value)}
              className="pl-9 text-sm border-slate-200 bg-slate-50 focus:bg-white"
            />
            {table.query && (
              <button
                onClick={() => table.setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {table.loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
              <RefreshCcw className="h-4 w-4 animate-spin" /> {t("clientLoading")}
            </div>
          ) : table.error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-sm text-slate-500">{table.error}</p>
              <button
                onClick={table.refetch}
                className="text-xs text-emerald-600 hover:underline"
              >
                {tCommon("retry")}
              </button>
            </div>
          ) : !table.data?.results.length ? (
            <div className="py-10 text-center">
              <Building2 className="mx-auto mb-2 h-7 w-7 text-slate-200" />
              <p className="text-sm text-slate-400">{t("clientNoResults")}</p>
              {table.query && <p className="text-xs text-slate-300 mt-0.5">{t("clientTryDifferent")}</p>}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {table.data.results.map((row) => {
                const isSelected = row.ID_Client === value
                const email = getEmail(row.Email_Address)
                const phone = getEmail(row.Phone_Number as any)
                const statusColor = STATUS_COLORS[row.Client_Status ?? ""] ?? "bg-slate-100 text-slate-500 border-slate-200"
                const isPodioMissing = syncPodio && !row.podio_item_id

                return (
                  <button
                    key={row.ID_Client}
                    type="button"
                    onClick={() => {
                      if (isPodioMissing) setPendingClient(row)
                      else handleSelect(row)
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                      isSelected ? "bg-emerald-50/70" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                      isSelected ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                    }`}>
                      {isSelected
                        ? <CheckCircle2 className="h-4 w-4" />
                        : <Building2 className="h-4 w-4" />
                      }
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {row.Client_Community ?? row.ID_Client}
                        </span>
                        {row.Client_Status && (
                          <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                            {row.Client_Status}
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-slate-400">
                        {row.Address && <span className="truncate max-w-[200px]">{row.Address}</span>}
                        {email && <span>{email}</span>}
                        {phone && <span>{phone}</span>}
                      </div>

                      {row.Compliance_Partner && (
                        <div className="mt-0.5 text-[10px] text-slate-300">
                          {t("clientPartner")} {row.Compliance_Partner}
                        </div>
                      )}
                    </div>

                    {/* ID badge and Podio status */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1 mt-1">
                      {isPodioMissing && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          {t("linkSubNotInPodio")}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-slate-300">
                        {row.ID_Client}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer / pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-400">
            {tCommon("page")} <span className="font-semibold text-slate-600">{table.page}</span> {tCommon("of")}{" "}
            <span className="font-semibold text-slate-600">{table.totalPages}</span>
            {table.data && (
              <span className="ml-1.5 text-slate-300">· {table.data.total} total</span>
            )}
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => table.setPage((p) => Math.max(1, p - 1))}
              disabled={table.page === 1 || table.loading}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> {t("clientPrev")}
            </button>
            <button
              onClick={() => table.setPage((p) => Math.min(table.totalPages, p + 1))}
              disabled={table.page >= table.totalPages || table.loading}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              {t("clientNext")} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <>
      {trigger}
      {modal}
    </>
  )
}