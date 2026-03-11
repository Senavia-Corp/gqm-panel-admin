"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/apiFetch"
import { Zap, ZapOff, AlertTriangle, Unlink } from "lucide-react"

type Props = {
  open: boolean
  onClose: () => void
  jobId: string
  memberId: string
  memberName?: string
  defaultSyncPodio?: boolean
  jobYear?: number
  onUnlinked?: () => Promise<void> | void
}

// ── Avatar helpers (same palette as siblings) ─────────────────────────────
const PALETTE = ["bg-emerald-500","bg-sky-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-teal-500"]
function avatarBg(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i)
  return PALETTE[Math.abs(h) % PALETTE.length]
}
function initials(name?: string) {
  if (!name) return "?"
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

export function UnlinkMemberDialog({
  open,
  onClose,
  jobId,
  memberId,
  memberName,
  defaultSyncPodio = true,
  jobYear,
  onUnlinked,
}: Props) {
  const { toast }                   = useToast()
  const [syncPodio, setSyncPodio]   = React.useState(defaultSyncPodio)
  const [loading, setLoading]       = React.useState(false)

  React.useEffect(() => { if (open) setSyncPodio(defaultSyncPodio) }, [open, defaultSyncPodio])

  const displayName = memberName ?? memberId
  const bg          = avatarBg(displayName)

  const handleUnlink = async () => {
    if (syncPodio && !jobYear) {
      toast({ title: "Missing job year", description: "Year is required when Sync Podio is enabled.", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const res = await apiFetch("/api/job-member", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, memberId, sync_podio: syncPodio, year: jobYear }),
      })

      const text = await res.text()
      let payload: any = null
      try { payload = JSON.parse(text) } catch { payload = { raw: text } }

      if (!res.ok) throw new Error(payload?.error || payload?.detail || "Failed to unlink member")

      toast({ title: "Member unlinked", description: `${displayName} removed from this job.` })
      await onUnlinked?.()
      onClose()
    } catch (err) {
      console.error("[UnlinkMemberDialog] error:", err)
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to unlink member.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!w-[95vw] !max-w-[460px] gap-0 overflow-hidden p-0">

        {/* Header with warning stripe */}
        <div className="border-b border-red-100 bg-red-50 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <Unlink className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900">Unlink Member</DialogTitle>
              <p className="mt-0.5 text-xs text-slate-500">This action will remove the member from the job.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Member preview */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${bg}`}>
              {initials(memberName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
              <p className="text-xs text-slate-400">{memberId}</p>
            </div>
          </div>

          {/* Warning message */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
            <p className="text-xs text-amber-700">
              Unlinking this member is irreversible. They will lose access and their project role will be removed.
            </p>
          </div>

          {/* Podio sync toggle */}
          <button
            type="button"
            onClick={() => setSyncPodio((v) => !v)}
            disabled={loading}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all ${
              syncPodio
                ? "border-emerald-300 bg-emerald-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {syncPodio
                ? <Zap className="h-4 w-4 fill-emerald-400 text-emerald-500" />
                : <ZapOff className="h-4 w-4 text-slate-400" />
              }
              <div className="text-left">
                <p className={`text-sm font-semibold ${syncPodio ? "text-emerald-700" : "text-slate-500"}`}>
                  Podio Sync {syncPodio ? "ON" : "OFF"}
                </p>
                <p className={`text-xs ${syncPodio ? "text-emerald-600" : "text-slate-400"}`}>
                  {syncPodio ? "Changes will sync to Podio" : "Changes will NOT sync to Podio"}
                </p>
              </div>
            </div>
            {syncPodio && jobYear && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                {jobYear}
              </span>
            )}
          </button>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlink}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Unlinking…
                </>
              ) : (
                <>
                  <Unlink className="mr-1.5 h-4 w-4" />
                  Unlink Member
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}