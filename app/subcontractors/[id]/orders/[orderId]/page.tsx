"use client"

// REG-025: conectado al backend real (antes 100% mock).
import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"
import { useTranslations } from "@/components/providers/LocaleProvider"

interface ApiEstimateCost {
  ID_EstimateCost: string
  Title: string | null
  Cost_type: string | null
  Builder_cost: number | null
  Client_price: number | null
  ID_Jobs: string | null
  ID_Order: string | null
}

interface ApiOrder {
  ID_Order: string
  Title: string | null
  Formula: number | null
  Adj_formula: number | null
  job_podio_id: string | null
  Notes: string | null
  estimate_costs?: ApiEstimateCost[]
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; orderId: string }>
}) {
  // Next 16: `params` es una PROMESA. Declarado como objeto plano, `parametros.id`
// era `undefined` y la pantalla pedía `/api/order?subcontractorId=undefined`.
// Medido: con sub-dev salía 403 y con admin-dev también fallaba —«No orders
// found» para un subcontratista que SÍ tiene una orden en la base—, así que no
// era un problema de permisos sino de que el filtro iba vacío. Se desenvuelve
// con `React.use()`.
  const parametros = use(params)
  const router = useRouter()
  const t = useTranslations("subcontractors")
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [orderName, setOrderName] = useState("")
  const [availableItems, setAvailableItems] = useState<ApiEstimateCost[]>([])
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const resp = await apiFetch(`/api/order/${encodeURIComponent(parametros.orderId)}`)
      if (!resp.ok) throw new Error(`(${resp.status})`)
      const data: ApiOrder = await resp.json()
      setOrder(data)
      setOrderName(data.Title ?? "")

      const jobId = data.estimate_costs?.[0]?.ID_Jobs
      if (jobId) {
        const av = await apiFetch(
          `/api/estimate?job_id=${encodeURIComponent(jobId)}&unassigned=true`,
        )
        if (av.ok) {
          const items = await av.json()
          setAvailableItems(Array.isArray(items) ? items : (items?.results ?? []))
        }
      } else {
        setAvailableItems([])
      }
    } catch (e) {
      console.error("[order-detail] load error:", e)
      setError("Order not found")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametros.orderId])

  const handleSave = async () => {
    if (!order) return
    setSaving(true)
    try {
      if (orderName !== (order.Title ?? "")) {
        const resp = await apiFetch(`/api/order/${encodeURIComponent(order.ID_Order)}`, {
          method: "PATCH",
          body: JSON.stringify({ Title: orderName }),
        })
        if (!resp.ok) throw new Error(`PATCH (${resp.status})`)
      }
      for (const itemId of selectedToAdd) {
        const resp = await apiFetch(`/api/estimate/${encodeURIComponent(itemId)}`, {
          method: "PATCH",
          body: JSON.stringify({ ID_Order: order.ID_Order }),
        })
        if (!resp.ok) throw new Error(`item ${itemId} (${resp.status})`)
      }
      setSelectedToAdd(new Set())
      await load()
    } catch (e) {
      console.error("[order-detail] save error:", e)
      window.alert("Could not save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!window.confirm("Remove this item from the order?")) return
    const resp = await apiFetch(`/api/estimate/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      body: JSON.stringify({ ID_Order: null }),
    })
    if (resp.ok) await load()
    else window.alert(`Could not remove item (${resp.status})`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">{error || "Order not found"}</p>
        <Button variant="outline" onClick={() => router.push(`/subcontractors/${parametros.id}/orders`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("backToOrders")}
        </Button>
      </div>
    )
  }

  const hasChanges = orderName !== (order.Title ?? "") || selectedToAdd.size > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push(`/subcontractors/${parametros.id}/orders`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToOrders")}
        </Button>
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("saveChanges")}
          </Button>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold">{t("orderDetails")}</h1>
        <p className="text-muted-foreground mt-1">Order ID: {order.ID_Order}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("orderInformation")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label className="mb-2 block font-bold">{t("orderName")}</Label>
              <Input value={orderName} onChange={(e) => setOrderName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block font-bold">Job (Podio ID)</Label>
              <Input value={order.job_podio_id ?? "—"} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label className="mb-2 block font-bold">Formula</Label>
              <Input value={`$${(order.Formula ?? 0).toFixed(2)}`} disabled className="bg-gray-50" />
            </div>
            <div>
              <Label className="mb-2 block font-bold">Adj. Formula</Label>
              <Input
                value={`$${(order.Adj_formula ?? order.Formula ?? 0).toFixed(2)}`}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items ({order.estimate_costs?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {order.estimate_costs?.length ? (
            <div className="divide-y rounded-md border">
              {order.estimate_costs.map((item) => (
                <div key={item.ID_EstimateCost} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{item.Title ?? item.ID_EstimateCost}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.Cost_type ?? "—"} · ${(item.Builder_cost ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleRemoveItem(item.ID_EstimateCost)}
                  >
                    {t("removeItem")}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("noItemsInOrder")}</p>
          )}
        </CardContent>
      </Card>

      {availableItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("addItemsFromJob")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-md border">
              {availableItems.map((item) => (
                <label
                  key={item.ID_EstimateCost}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3"
                >
                  <Checkbox
                    checked={selectedToAdd.has(item.ID_EstimateCost)}
                    onCheckedChange={(checked) => {
                      setSelectedToAdd((prev) => {
                        const next = new Set(prev)
                        if (checked) next.add(item.ID_EstimateCost)
                        else next.delete(item.ID_EstimateCost)
                        return next
                      })
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{item.Title ?? item.ID_EstimateCost}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.Cost_type ?? "—"} · ${(item.Builder_cost ?? 0).toFixed(2)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
