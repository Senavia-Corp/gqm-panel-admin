"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/apiFetch"

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    order: any | null

    defaultSyncPodio: boolean
    jobYearForPodioSync?: number
    jobPodioId?: string
    subcontractorId?: string

    /** callback para que el parent refresque orders */
    onDeleted?: () => void
}

export function DeleteOrderDialog({
    open,
    onOpenChange,
    order,
    defaultSyncPodio,
    jobYearForPodioSync,
    onDeleted,
    jobPodioId,
    subcontractorId
}: Props) {
    const [syncPodio, setSyncPodio] = useState<boolean>(defaultSyncPodio)
    const [submitting, setSubmitting] = useState(false)
    const [step, setStep] = useState<"idle" | "detaching" | "deleting">("idle")
    console.log("Aqui la order a eliminar", order);
    

    useEffect(() => {
        if (open) {
            setSyncPodio(defaultSyncPodio)
            setStep("idle")
        }
    }, [open, defaultSyncPodio])

    const changeOrdersCount = useMemo(() => {
        const arr = order?.change_orders ?? order?.changeOrders ?? []
        return Array.isArray(arr) ? arr.length : 0
    }, [order])

    const estimateCosts = useMemo(() => {
        const arr = order?.Items ?? order?.estimate_costs ?? []
        return Array.isArray(arr) ? arr : []
    }, [order])

    const estimateCount = estimateCosts.length

    const canDelete = !!order?.ID_Order && changeOrdersCount === 0

    const handleDelete = async () => {
        if (!order?.ID_Order) return
        if (!canDelete) return

        // Si sync_podio=true, exige year
        if (syncPodio && !jobYearForPodioSync) return

        try {
            setSubmitting(true)

            // 1) Detach estimate costs (si hay)
            if (estimateCount > 0) {
                setStep("detaching")

                // PATCH en serie (más simple y evita saturar)
                for (const ec of estimateCosts) {
                    const ecId = ec?.ID_EstimateCost
                    if (!ecId) continue

                    const res = await fetch(`/api/estimate/${encodeURIComponent(ecId)}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ID_Order: null }),
                    })

                    const text = await res.text().catch(() => "")
                    let body: any = text
                    try {
                        body = text ? JSON.parse(text) : {}
                    } catch { }

                    if (!res.ok) {
                        const msg =
                            (typeof body === "object" && (body.detail || body.error || body.message)) ||
                            (typeof body === "string" ? body : "Failed to detach estimate costs")
                        throw new Error(msg)
                    }
                }
            }

            // 2) Delete order
            setStep("deleting")

            const qs = new URLSearchParams()
            qs.set("sync_podio", syncPodio ? "true" : "false")
            if (syncPodio && jobYearForPodioSync) qs.set("year", String(jobYearForPodioSync))

            const delRes = await apiFetch(`/api/order/${encodeURIComponent(order.ID_Order)}?${qs.toString()}`, {
                method: "DELETE",
            })

            const contentType = delRes.headers.get("content-type") || ""
            const isJson = contentType.includes("application/json")
            const delBody: any = isJson ? await delRes.json() : await delRes.text()

            if (!delRes.ok) {
                const msg =
                    (typeof delBody === "object" && (delBody.detail || delBody.message)) ||
                    (typeof delBody === "string" ? delBody : "Failed to delete order")
                throw new Error(msg)
            }

            toast.success("Order deleted")
            onOpenChange(false)
            onDeleted?.()
        } catch (e: any) {
            toast.error(e?.message ?? "Failed to delete order")
        } finally {
            setSubmitting(false)
            setStep("idle")
        }
    }

    if (!order) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-red-600" />
                        Delete Order
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="rounded-md border p-3 bg-muted/40">
                        <div className="font-semibold">{order.Title || "Order"}</div>
                        <div className="text-sm text-muted-foreground">{order.ID_Order}</div>
                    </div>

                    {changeOrdersCount > 0 && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 mt-0.5" />
                                <div>
                                    <div className="font-semibold">You can’t delete this order yet</div>
                                    <div className="text-sm mt-1">
                                        This order has <b>{changeOrdersCount}</b> change order(s). Please delete the change orders first.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                            <Label className="text-sm font-semibold">Sync Podio</Label>
                            <div className="text-xs text-muted-foreground">
                                If enabled, the delete will be synced to Podio (requires year).
                            </div>
                            {syncPodio && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    Year: <b>{jobYearForPodioSync ?? "—"}</b>
                                </div>
                            )}
                        </div>
                        <Switch checked={syncPodio} onCheckedChange={setSyncPodio} />
                    </div>

                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-900 text-sm">
                        This action is permanent. The order will be removed from the database.
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={submitting || !canDelete || (syncPodio && !jobYearForPodioSync)}
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}