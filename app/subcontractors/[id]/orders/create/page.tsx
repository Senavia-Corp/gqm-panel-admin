"use client"

// REG-026: conectado al backend real (antes 100% mock).
import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Plus } from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"
import { useTranslations } from "@/components/providers/LocaleProvider"

interface ApiJob {
  ID_Jobs: string
  Project_name: string | null
  podio_item_id: string | null
}

interface ApiEstimateCost {
  ID_EstimateCost: string
  Title: string | null
  Cost_type: string | null
  Builder_cost: number | null
}

export default function CreateOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
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
  const [orderName, setOrderName] = useState("")
  const [jobs, setJobs] = useState<ApiJob[]>([])
  const [selectedJobId, setSelectedJobId] = useState("")
  const [availableItems, setAvailableItems] = useState<ApiEstimateCost[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [loadingItems, setLoadingItems] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    ;(async () => {
      try {
        const resp = await apiFetch("/api/jobs?limit=200")
        if (!resp.ok) throw new Error(`(${resp.status})`)
        const data = await resp.json()
        const list = Array.isArray(data) ? data : (data?.results ?? [])
        setJobs(list)
      } catch (e) {
        console.error("[create-order] jobs error:", e)
        setError("Could not load jobs")
      }
    })()
  }, [])

  useEffect(() => {
    if (!selectedJobId) return
    ;(async () => {
      setLoadingItems(true)
      setSelectedItems(new Set())
      try {
        const resp = await apiFetch(
          `/api/estimate?job_id=${encodeURIComponent(selectedJobId)}&unassigned=true`,
        )
        const data = resp.ok ? await resp.json() : []
        setAvailableItems(Array.isArray(data) ? data : (data?.results ?? []))
      } finally {
        setLoadingItems(false)
      }
    })()
  }, [selectedJobId])

  const handleToggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const selectedDetails = availableItems.filter((i) => selectedItems.has(i.ID_EstimateCost))
  const totalBuilderCost = selectedDetails.reduce((sum, i) => sum + (i.Builder_cost ?? 0), 0)
  const selectedJob = jobs.find((j) => j.ID_Jobs === selectedJobId)

  const handleCreate = async () => {
    if (!orderName || !selectedJobId) return
    setCreating(true)
    setError("")
    try {
      const resp = await apiFetch("/api/order", {
        method: "POST",
        body: JSON.stringify({
          Title: orderName,
          ID_Subcontractor: parametros.id,
          job_podio_id: selectedJob?.podio_item_id ?? null,
          estimate_cost_ids: Array.from(selectedItems),
        }),
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        setError(data.detail || data.error || `Could not create order (${resp.status})`)
        return
      }
      router.push(`/subcontractors/${parametros.id}/orders`)
    } catch (e) {
      console.error("[create-order] error:", e)
      setError("Could not create order")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/subcontractors/${parametros.id}/orders`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToOrders")}
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{t("createNewOrder")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("createOrderSubtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("orderInformation")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2 block font-bold">{t("orderName")}</Label>
            <Input
              placeholder="e.g., Kitchen Renovation Package"
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2 block font-bold">{t("selectJob")}</Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder={t("chooseJob")} />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.ID_Jobs} value={job.ID_Jobs}>
                    {job.ID_Jobs}
                    {job.Project_name ? ` — ${job.Project_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedJobId && (
        <Card>
          <CardHeader>
            <CardTitle>Estimate items ({availableItems.length} available)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : availableItems.length ? (
              <div className="divide-y rounded-md border">
                {availableItems.map((item) => (
                  <label
                    key={item.ID_EstimateCost}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3"
                  >
                    <Checkbox
                      checked={selectedItems.has(item.ID_EstimateCost)}
                      onCheckedChange={() => handleToggleItem(item.ID_EstimateCost)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.Title ?? item.ID_EstimateCost}</p>
                      <p className="text-xs text-muted-foreground">{item.Cost_type ?? "—"}</p>
                    </div>
                    <span className="text-sm font-semibold">
                      ${(item.Builder_cost ?? 0).toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("noUnassignedItems")}
              </p>
            )}

            {selectedItems.size > 0 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {selectedItems.size} item(s) selected
                </p>
                <p className="text-sm font-semibold">Total: ${totalBuilderCost.toFixed(2)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <Button
          onClick={handleCreate}
          disabled={!orderName || !selectedJobId || creating}
          className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t("createNewOrder")}
        </Button>
      </div>
    </div>
  )
}
