"use client"

// REG-024: conectado al backend real (antes 100% mock).
import { use, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Eye, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/apiFetch"
import { useTranslations } from "@/components/providers/LocaleProvider"

interface ApiOrder {
  ID_Order: string
  Title: string | null
  Formula: number | null
  Adj_formula: number | null
  job_podio_id: string | null
  Notes: string | null
  estimate_costs?: { ID_EstimateCost: string }[]
}

export default function SubcontractorOrdersPage({
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
  const t = useTranslations("subcontractors")
  const router = useRouter()
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const itemsPerPage = 10

  const loadOrders = async () => {
    setLoading(true)
    setError("")
    try {
      const resp = await apiFetch(`/api/order?subcontractorId=${encodeURIComponent(parametros.id)}`)
      if (!resp.ok) throw new Error(`(${resp.status})`)
      const data = await resp.json()
      setOrders(Array.isArray(data) ? data : (data?.results ?? []))
    } catch (e) {
      // «No hay órdenes» y «no puedes verlas» son cosas distintas y aquí se
      // pintaban con el mismo texto: un 403 finance:read acababa en
      // «No orders found», que es una afirmación FALSA sobre los datos.
      console.error("[orders] load error:", e)
      const esProhibido = String(e).includes("(403)")
      setError(esProhibido ? t("noPermissionOrders") : t("errorLoadingOrders"))
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametros.id])

  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return orders.filter(
      (o) =>
        (o.Title ?? "").toLowerCase().includes(q) ||
        o.ID_Order.toLowerCase().includes(q),
    )
  }, [orders, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  const handleDeleteOrder = async (order: ApiOrder) => {
    if (!window.confirm(`${t("deleteOrder") ?? "Delete order"} ${order.ID_Order}?`)) return
    setDeletingId(order.ID_Order)
    try {
      const resp = await apiFetch(`/api/order/${encodeURIComponent(order.ID_Order)}`, {
        method: "DELETE",
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        window.alert(data.detail || data.error || `Error (${resp.status})`)
        return
      }
      await loadOrders()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("tabOrders")}</h1>
          <p className="text-muted-foreground mt-1">{t("ordersDesc")}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchOrders")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => router.push(`/subcontractors/${parametros.id}/orders/create`)}
              className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
            >
              <Plus className="h-4 w-4" />
              {t("createNewOrder")}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : paginatedOrders.length > 0 ? (
            <>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">{t("orderId")}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">{t("orderName")}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">{t("jobId")}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">{t("items")}</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">{t("formula")}</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">{t("adjFormula")}</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedOrders.map((order) => (
                      <tr key={order.ID_Order} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{order.ID_Order}</td>
                        <td className="px-4 py-3 text-sm">{order.Title ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {order.job_podio_id ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">{order.estimate_costs?.length ?? 0}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">
                          ${(order.Formula ?? 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">
                          ${(order.Adj_formula ?? order.Formula ?? 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(`/subcontractors/${parametros.id}/orders/${order.ID_Order}`)
                              }
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingId === order.ID_Order}
                              onClick={() => handleDeleteOrder(order)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {t.rich("showingRange", {
                    start: startIndex + 1,
                    end: Math.min(endIndex, filteredOrders.length),
                    total: filteredOrders.length,
                    b: (chunks: React.ReactNode) => <span className="font-semibold text-slate-900">{chunks}</span>,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t("prev")}
                  </Button>
                  <span className="text-sm">
                    {t("pageOf", { current: currentPage, total: totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t("next")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{error || t("noOrdersFound")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
