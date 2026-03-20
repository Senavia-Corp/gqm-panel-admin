"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { Zap, ZapOff, CheckCircle2, Loader2, X, AlertTriangle } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  jobId: string
  jobYear?: number
  bdfCount: number      // how many BDF items were in the import
  ptlgcfCount: number   // how many PTLGCF items were in the import
}

export function PodioSyncAfterImportDialog({
  open, onClose, jobId, jobYear, bdfCount, ptlgcfCount,
}: Props) {
  const [syncPodio, setSyncPodio] = useState(false)
  const [syncing,   setSyncing]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ sync_podio: "true" })
      if (jobYear) qs.set("year", String(jobYear))

      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}?${qs.toString()}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({}),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any)?.error ?? (err as any)?.detail ?? `Error ${res.status}`)
      }

      setDone(true)
    } catch (e: any) {
      setError(e?.message ?? "Podio sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const handleClose = () => {
    setSyncPodio(false)
    setDone(false)
    setError(null)
    onClose()
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !syncing) handleClose() }}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <Zap className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Sync Podio Fields</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Your import included fields that affect Podio
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={syncing}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* ── What was imported ────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Imported items affecting Podio
            </p>
            {bdfCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                  {bdfCount} BDF
                </span>
                <span className="text-[11px] text-slate-500">
                  → updates{" "}
                  <span className="font-mono font-semibold">Bldg_dept_fees</span>
                  {" "}(slots 1–{Math.min(bdfCount, 3)} of 3)
                </span>
              </div>
            )}
            {ptlgcfCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-100 border border-sky-200 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                  {ptlgcfCount} PTLGCF
                </span>
                <span className="text-[11px] text-slate-500">
                  → updates{" "}
                  <span className="font-mono font-semibold">Ptl_gc_fee</span>
                </span>
              </div>
            )}
            {bdfCount > 3 && (
              <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">
                  Only the first 3 BDF values will be sent to Podio (3-slot limit).
                  The remaining {bdfCount - 3} BDF items are saved in DB only.
                </p>
              </div>
            )}
          </div>

          {/* ── Toggle ───────────────────────────────────────────────── */}
          {!done && (
            <>
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Podio Sync
                </p>
                <button
                  type="button"
                  onClick={() => setSyncPodio((v) => !v)}
                  disabled={syncing}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                    syncPodio
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                  } ${syncing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {syncPodio
                    ? <Zap className="h-4 w-4 fill-emerald-400 text-emerald-500 flex-shrink-0" />
                    : <ZapOff className="h-4 w-4 flex-shrink-0" />
                  }
                  <div className="flex-1 text-left">
                    <span className="text-xs font-semibold">
                      Sync to Podio {syncPodio ? "ON" : "OFF"}
                    </span>
                    {syncPodio && jobYear && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        {jobYear}
                      </span>
                    )}
                    {syncPodio && !jobYear && (
                      <span className="ml-2 text-[10px] text-red-500">Year not resolved — sync may fail</span>
                    )}
                  </div>
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-700">{error}</p>
                </div>
              )}
            </>
          )}

          {/* ── Success ──────────────────────────────────────────────── */}
          {done && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Synced successfully</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  Podio has been updated with the latest values.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={syncing}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {done ? "Close" : "Skip"}
          </button>

          {!done && syncPodio && (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {syncing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing…</>
                : <><Zap className="h-4 w-4" /> Sync to Podio</>
              }
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}