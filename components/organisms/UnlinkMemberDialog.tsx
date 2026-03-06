"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/apiFetch"

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
    const { toast } = useToast()
    const [syncPodio, setSyncPodio] = React.useState(defaultSyncPodio)
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        if (!open) return
        setSyncPodio(defaultSyncPodio)
    }, [open, defaultSyncPodio])

    const handleUnlink = async () => {
        if (syncPodio && !jobYear) {
            toast({
                title: "Missing job year",
                description: "Year is required when Sync Podio is enabled.",
                variant: "destructive",
            })
            return
        }

        setLoading(true)
        try {
            const qs = new URLSearchParams()
            qs.set("sync_podio", String(syncPodio))
            if (jobYear) qs.set("year", String(jobYear))

            const res = await apiFetch("/api/job-member", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId,
                    memberId,
                    sync_podio: syncPodio,
                    year: jobYear,
                }),
            })

            const text = await res.text()
            let payload: any = null
            try {
                payload = JSON.parse(text)
            } catch {
                payload = { raw: text }
            }

            if (!res.ok) throw new Error(payload?.error || payload?.detail || "Failed to unlink member")

            toast({ title: "Unlinked", description: "Member unlinked successfully." })
            await onUnlinked?.()
            onClose()
        } catch (err) {
            console.error("[UnlinkMemberDialog] unlink error:", err)
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to unlink member.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="!w-[95vw] !max-w-[600px]">
                <DialogHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <DialogTitle>Unlink Member</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Are you sure you want to unlink <span className="font-medium text-foreground">{memberName ?? memberId}</span>{" "}
                            from this job? This action cannot be undone.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2">
                        <div className="leading-tight">
                            <Label className="text-sm">Sync Podio</Label>
                            <p className="text-xs text-muted-foreground">{syncPodio ? "Enabled" : "Disabled"}</p>
                        </div>
                        <Switch checked={syncPodio} onCheckedChange={setSyncPodio} />
                    </div>
                </DialogHeader>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleUnlink} disabled={loading}>
                        {loading ? "Unlinking..." : "Unlink"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}