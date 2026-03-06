"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ExternalLink, RefreshCcw, AlertTriangle } from "lucide-react"

type PurchaseOrderItem = {
  ID_PurchaseOrderItem?: string | null
  Name?: string | null
  Quote_shop?: string | null
  Quote_link?: string | null
  Quote_value?: number | null
  Purchase_shop?: string | null
  Purchase_link?: string | null
  Purchase_value?: number | null
}

type PurchaseOrder = {
  ID_PurchaseOrder?: string | null
  Order_title?: string | null
  Est_delivery_date?: string | null
  Order_confirmation?: boolean | null
  porder_items?: PurchaseOrderItem[] | null
}

type Purchase = {
  ID_Purchase?: string | null
  Selling_rep?: string | null
  Description?: string | null
  PickUp_person?: string | null
  Delivery_location?: string | null
  Status?: "In Progress" | "Completed" | string | null
  Return_request?: string | null
  Return_status?: string | null
  Purchase_note?: string | null
  Total_spending?: number | null
  purchase_orders?: PurchaseOrder[] | null
}

const asString = (v: unknown) => (v == null ? "" : String(v))
const asNumber = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

const safeWebsite = (url?: string | null) => {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`
}

const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)

const formatDate = (raw?: string | null) => {
  if (!raw) return "-"
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "2-digit" })
}

const statusBadge = (status?: string | null) => {
  if (status === "Completed") return "bg-green-500 text-white"
  if (status === "In Progress") return "bg-yellow-500 text-white"
  return "bg-gray-400 text-white"
}

export default function PurchasesDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [user, setUser] = useState<any>(null)

  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchPurchase = async (purchaseId: string) => {
    try {
      setLoading(true)
      setLoadError(null)

      const response = await fetch(`/api/purchases/${purchaseId}`, { cache: "no-store" })
      if (!response.ok) throw new Error(`Failed to fetch purchase (${response.status})`)

      const data = (await response.json()) as Purchase

      setPurchase({
        ...data,
        purchase_orders: Array.isArray(data.purchase_orders) ? data.purchase_orders : [],
      })
    } catch (error: any) {
      console.error("Error fetching purchase:", error)
      setPurchase(null)
      setLoadError(error?.message ?? "Failed to load purchase")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

  useEffect(() => {
    if (!user) return
    if (!id) return
    fetchPurchase(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id])

  const computed = useMemo(() => {
    const orders = Array.isArray(purchase?.purchase_orders) ? purchase!.purchase_orders! : []
    const items = orders.flatMap((o) => (Array.isArray(o.porder_items) ? o.porder_items : []))

    const totalQuoted = items.reduce((acc, it) => acc + asNumber(it?.Quote_value), 0)
    const totalSpentFromItems = items.reduce((acc, it) => acc + asNumber(it?.Purchase_value), 0)

    const totalSpendingDb = asNumber(purchase?.Total_spending)
    const diffDbVsItems = totalSpendingDb - totalSpentFromItems

    const totalSaved = totalQuoted - totalSpentFromItems

    const hasMismatch = totalSpendingDb > 0 && Math.abs(diffDbVsItems) > 0.009

    return {
      ordersCount: orders.length,
      itemsCount: items.length,
      totalQuoted,
      totalSpentFromItems,
      totalSpendingDb,
      diffDbVsItems,
      totalSaved,
      hasMismatch,
    }
  }, [purchase])

  if (!user) return null

  if (!id) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-y-auto p-6">
            <Card className="p-6">
              <h1 className="text-xl font-semibold">Invalid purchase id</h1>
              <p className="mt-2 text-sm text-muted-foreground">The URL is missing the purchase id.</p>
              <div className="mt-4">
                <Button onClick={() => router.push("/purchases")} variant="outline">
                  Back to Purchases
                </Button>
              </div>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex h-64 items-center justify-center rounded-lg border bg-white">
              <p className="text-gray-500">Loading purchase...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!purchase) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-y-auto p-6">
            <Button variant="ghost" onClick={() => router.push("/purchases")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Purchases
            </Button>

            <Card className="p-6">
              <h1 className="text-xl font-semibold">Purchase could not be loaded</h1>
              <p className="mt-2 text-sm text-red-600">{loadError ?? "Unknown error."}</p>
              <div className="mt-4">
                <Button onClick={() => fetchPurchase(id)} className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <Button variant="ghost" onClick={() => router.push("/purchases")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchases
          </Button>

          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{purchase.ID_Purchase ?? id}</h1>
              <p className="text-sm text-muted-foreground">{asString(purchase.Description) || "—"}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-4 py-1 text-sm font-semibold ${statusBadge(purchase.Status)}`}>
                {purchase.Status ?? "Unknown"}
              </span>
            </div>
          </div>

          {computed.hasMismatch ? (
            <Card className="mb-6 border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-700" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">Spending mismatch detected</p>
                  <p className="text-sm text-yellow-800">
                    DB Total_spending ({money(computed.totalSpendingDb)}) does not match the sum of item Purchase_value (
                    {money(computed.totalSpentFromItems)}). Difference: {money(computed.diffDbVsItems)}.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Orders & Items</h2>

                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">P. Orders: {computed.ordersCount}</Badge>
                  <Badge variant="secondary">Items: {computed.itemsCount}</Badge>
                  <Badge variant="secondary">Quoted: {money(computed.totalQuoted)}</Badge>
                  <Badge variant="secondary">Spent (items): {money(computed.totalSpentFromItems)}</Badge>
                </div>

                {Array.isArray(purchase.purchase_orders) && purchase.purchase_orders.length ? (
                  <div className="space-y-4">
                    {purchase.purchase_orders.map((po) => {
                      const poItems = Array.isArray(po.porder_items) ? po.porder_items : []
                      const poQuoted = poItems.reduce((acc, it) => acc + asNumber(it?.Quote_value), 0)
                      const poSpent = poItems.reduce((acc, it) => acc + asNumber(it?.Purchase_value), 0)

                      return (
                        <Card key={asString(po.ID_PurchaseOrder) || Math.random()} className="p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">{po.ID_PurchaseOrder ?? "—"}</p>
                              <h3 className="text-lg font-semibold">{asString(po.Order_title) || "Untitled order"}</h3>
                              <p className="text-sm text-muted-foreground">
                                Est. delivery: {formatDate(po.Est_delivery_date)} · Confirmed:{" "}
                                {po.Order_confirmation ? "Yes" : "No"}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2 sm:justify-end">
                              <Badge variant="secondary">Items: {poItems.length}</Badge>
                              <Badge variant="secondary">Quoted: {money(poQuoted)}</Badge>
                              <Badge variant="secondary">Spent: {money(poSpent)}</Badge>
                            </div>
                          </div>

                          <div className="mt-4 overflow-hidden rounded-lg border bg-white">
                            <table className="w-full table-fixed">
                              <colgroup>
                                <col className="w-[28%]" />
                                <col className="w-[36%]" />
                                <col className="w-[36%]" />
                              </colgroup>
                              <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-semibold text-gray-600">
                                  <th className="px-4 py-3">Item</th>
                                  <th className="px-4 py-3">Quote (initial)</th>
                                  <th className="px-4 py-3">Purchase (final)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {poItems.length ? (
                                  poItems.map((it) => {
                                    const quoteLink = safeWebsite(it.Quote_link ?? null)
                                    const purchaseLink = safeWebsite(it.Purchase_link ?? null)

                                    return (
                                      <tr key={asString(it.ID_PurchaseOrderItem) || Math.random()} className="text-sm">
                                        <td className="px-4 py-4">
                                          <p className="font-medium">{asString(it.Name) || "—"}</p>
                                          <p className="text-xs text-muted-foreground">{it.ID_PurchaseOrderItem ?? ""}</p>
                                        </td>

                                        <td className="px-4 py-4">
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="font-semibold">{money(asNumber(it.Quote_value))}</p>
                                              <p className="text-xs text-muted-foreground">{asString(it.Quote_shop) || "—"}</p>
                                            </div>

                                            {quoteLink ? (
                                              <a
                                                href={quoteLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-0.5 inline-flex items-center gap-1 text-xs text-blue-600"
                                              >
                                                Link <ExternalLink className="h-3 w-3" />
                                              </a>
                                            ) : null}
                                          </div>
                                        </td>

                                        <td className="px-4 py-4">
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="font-semibold">{money(asNumber(it.Purchase_value))}</p>
                                              <p className="text-xs text-muted-foreground">{asString(it.Purchase_shop) || "—"}</p>
                                            </div>

                                            {purchaseLink ? (
                                              <a
                                                href={purchaseLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-0.5 inline-flex items-center gap-1 text-xs text-blue-600"
                                              >
                                                Link <ExternalLink className="h-3 w-3" />
                                              </a>
                                            ) : null}
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                      No items found for this order.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border bg-white p-6">
                    <p className="text-sm text-muted-foreground">No purchase orders found for this purchase.</p>
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Summary</h2>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Selling Rep:</span> {asString(purchase.Selling_rep) || "-"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Description:</span> {asString(purchase.Description) || "-"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Status:</span> {asString(purchase.Status) || "-"}
                  </p>

                  <div className="mt-4 space-y-2">
                    <p>
                      <span className="font-medium text-foreground">Total quoted (calc):</span> {money(computed.totalQuoted)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Total spent (items calc):</span>{" "}
                      {money(computed.totalSpentFromItems)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Final spending:</span> {money(computed.totalSpendingDb)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Total saved:</span> {money(computed.totalSaved)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Delivery & Notes</h2>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Pick up person:</span> {asString(purchase.PickUp_person) || "-"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Delivery location:</span>{" "}
                    {asString(purchase.Delivery_location) || "-"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Return request:</span> {asString(purchase.Return_request) || "-"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Return status:</span> {asString(purchase.Return_status) || "-"}
                  </p>
                  <div className="pt-2">
                    <p className="font-medium text-foreground">Purchase note:</p>
                    <p className="mt-1 whitespace-pre-wrap">{asString(purchase.Purchase_note) || "-"}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="mb-3 text-xl font-semibold">Actions</h2>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" onClick={() => fetchPurchase(id)} className="gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
