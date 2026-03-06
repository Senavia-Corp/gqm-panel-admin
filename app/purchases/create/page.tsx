"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RefreshCcw, ArrowLeft, CheckCircle2, Plus, Trash2 } from "lucide-react"

type CreatedItem = {
  ID_PurchaseOrderItem?: string | null
  Name?: string | null
  Quote_shop?: string | null
  Quote_link?: string | null
  Quote_value?: number | null
  Purchase_shop?: string | null
  Purchase_link?: string | null
  Purchase_value?: number | null
}

type CreatedOrder = {
  ID_PurchaseOrder?: string | null
  Order_title?: string | null
  items: CreatedItem[]
}

type CreatedPurchase = {
  ID_Purchase?: string | null
  Selling_rep?: string | null
  Description?: string | null
  Status?: string | null
  orders: CreatedOrder[]
}

const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)

const asNumber = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

const safeWebsite = (url?: string) => {
  const trimmed = (url ?? "").trim()
  if (!trimmed) return ""
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`
}

type Step = 1 | 2 | 3

// AJUSTA ESTOS ENDPOINTS SI TUS PROXIES TIENEN OTRO PATH
const API = {
  purchases: "/api/purchases",
  purchaseOrders: "/api/purchase-orders",
  purchaseOrderItems: "/api/purchase-order-items",
}

async function postJson<T>(url: string, payload: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  })

  const contentType = res.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const body = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    const detail =
      (isJson && (body?.detail || body?.error)) ? (body.detail || body.error) : `Request failed (${res.status})`
    throw new Error(detail)
  }

  return body as T
}

export default function PurchasesCreatePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  const [step, setStep] = useState<Step>(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [created, setCreated] = useState<CreatedPurchase>({
    ID_Purchase: null,
    Selling_rep: "",
    Description: "",
    Status: "In Progress",
    orders: [],
  })

  // Step 1 form
  const [sellingRep, setSellingRep] = useState("")
  const [description, setDescription] = useState("")

  // Step 2 form
  const [orderTitle, setOrderTitle] = useState("")

  // Step 3 form
  const [itemName, setItemName] = useState("")
  const [quoteShop, setQuoteShop] = useState("")
  const [quoteLink, setQuoteLink] = useState("")
  const [quoteValue, setQuoteValue] = useState<string>("")

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

  const activeOrder = useMemo(() => {
    if (!created.orders.length) return null
    return created.orders[created.orders.length - 1]
  }, [created.orders])

  const totals = useMemo(() => {
    const allItems = created.orders.flatMap((o) => o.items)
    const totalQuoted = allItems.reduce((acc, it) => acc + asNumber(it.Quote_value), 0)
    const totalSpent = allItems.reduce((acc, it) => acc + asNumber(it.Purchase_value), 0)
    return {
      ordersCount: created.orders.length,
      itemsCount: allItems.length,
      totalQuoted,
      totalSpent,
    }
  }, [created.orders])

  const canCreatePurchase = sellingRep.trim().length > 0 && description.trim().length > 0
  const canCreateOrder = orderTitle.trim().length > 0
  const canCreateItem =
    itemName.trim().length > 0 &&
    quoteShop.trim().length > 0 &&
    safeWebsite(quoteLink).trim().length > 0 &&
    asNumber(quoteValue) > 0

  const resetItemForm = () => {
    setItemName("")
    setQuoteShop("")
    setQuoteLink("")
    setQuoteValue("")
  }

  const createPurchase = async () => {
    try {
      setLoading(true)
      setError(null)

      const payload = {
        Selling_rep: sellingRep.trim(),
        Description: description.trim(),
        Status: "In Progress",
      }

      const data = await postJson<{ ID_Purchase?: string }>(API.purchases, payload)

      const id = data?.ID_Purchase
      if (!id) throw new Error("Purchase created but no ID_Purchase returned")

      setCreated({
        ID_Purchase: id,
        Selling_rep: payload.Selling_rep,
        Description: payload.Description,
        Status: payload.Status,
        orders: [],
      })

      setStep(2)
    } catch (e: any) {
      setError(e?.message ?? "Failed to create purchase")
    } finally {
      setLoading(false)
    }
  }

  const createPurchaseOrder = async () => {
    try {
      if (!created.ID_Purchase) return
      setLoading(true)
      setError(null)

      const payload = {
        Order_title: orderTitle.trim(),
        Order_confirmation: false,
        ID_Purchase: created.ID_Purchase,
      }

      const data = await postJson<{ ID_PurchaseOrder?: string }>(API.purchaseOrders, payload)

      const id = data?.ID_PurchaseOrder
      if (!id) throw new Error("Purchase order created but no ID_PurchaseOrder returned")

      setCreated((prev) => ({
        ...prev,
        orders: [...prev.orders, { ID_PurchaseOrder: id, Order_title: payload.Order_title, items: [] }],
      }))

      setOrderTitle("")
      setStep(3)
    } catch (e: any) {
      setError(e?.message ?? "Failed to create purchase order")
    } finally {
      setLoading(false)
    }
  }

  const addPurchaseOrderItem = async () => {
    try {
      if (!activeOrder?.ID_PurchaseOrder) return
      setLoading(true)
      setError(null)

      const payload = {
        Name: itemName.trim(),
        Quote_shop: quoteShop.trim(),
        Quote_link: safeWebsite(quoteLink).trim(),
        Quote_value: asNumber(quoteValue),
        Purchase_shop: "",
        Purchase_link: "",
        Purchase_value: null,
        ID_PurchaseOrder: activeOrder.ID_PurchaseOrder,
      }

      const data = await postJson<{ ID_PurchaseOrderItem?: string }>(API.purchaseOrderItems, payload)

      const id = data?.ID_PurchaseOrderItem
      if (!id) throw new Error("Item created but no ID_PurchaseOrderItem returned")

      setCreated((prev) => {
        const orders = [...prev.orders]
        const last = orders[orders.length - 1]
        orders[orders.length - 1] = {
          ...last,
          items: [...last.items, { ...payload, ID_PurchaseOrderItem: id }],
        }
        return { ...prev, orders }
      })

      resetItemForm()
    } catch (e: any) {
      setError(e?.message ?? "Failed to create purchase order item")
    } finally {
      setLoading(false)
    }
  }

  const removeLocalItem = (orderIndex: number, itemIndex: number) => {
    // SOLO UI: DELETE LO IMPLEMENTAMOS MÁS ADELANTE (COMO DIJISTE)
    setCreated((prev) => {
      const orders = prev.orders.map((o) => ({ ...o, items: [...o.items] }))
      orders[orderIndex].items.splice(itemIndex, 1)
      return { ...prev, orders }
    })
  }

  const startNewOrder = () => {
    setError(null)
    setOrderTitle("")
    setStep(2)
  }

  const finish = () => {
    router.push("/purchases")
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <Button variant="ghost" onClick={() => router.push("/purchases")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Purchases
            </Button>
          </div>

          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Create Purchase</h1>
              <p className="text-sm text-muted-foreground">
                Step {step} of 3 · Create purchase → purchase order → quote items
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Orders: {totals.ordersCount}</Badge>
              <Badge variant="secondary">Items: {totals.itemsCount}</Badge>
              <Badge variant="secondary">Quoted: {money(totals.totalQuoted)}</Badge>
            </div>
          </div>

          {error ? (
            <Card className="mb-6 border-red-200 bg-red-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-red-700">{error}</p>
                <Button variant="outline" size="sm" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </div>
            </Card>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* STEP INDICATOR */}
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`flex items-center gap-2 ${step >= 1 ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border bg-white text-sm font-semibold">
                      1
                    </span>
                    <span className="text-sm font-semibold">Purchase</span>
                    {created.ID_Purchase ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : null}
                  </div>

                  <div className="h-px flex-1 bg-gray-200" />

                  <div className={`flex items-center gap-2 ${step >= 2 ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border bg-white text-sm font-semibold">
                      2
                    </span>
                    <span className="text-sm font-semibold">Purchase Order</span>
                    {created.orders.length ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : null}
                  </div>

                  <div className="h-px flex-1 bg-gray-200" />

                  <div className={`flex items-center gap-2 ${step >= 3 ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border bg-white text-sm font-semibold">
                      3
                    </span>
                    <span className="text-sm font-semibold">Quote Items</span>
                  </div>
                </div>
              </Card>

              {/* STEP 1 */}
              {step === 1 ? (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold">Purchase</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Status will be set automatically to <span className="font-semibold">In Progress</span>.
                  </p>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-sm font-medium">Selling Rep</label>
                      <Input
                        value={sellingRep}
                        onChange={(e) => setSellingRep(e.target.value)}
                        placeholder="e.g. Paola Colman"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Tile 12x8"
                        className="mt-1"
                      />
                    </div>

                    <div className="pt-2">
                      <Button disabled={!canCreatePurchase || loading} onClick={createPurchase} className="gap-2">
                        {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : null}
                        Create Purchase
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}

              {/* STEP 2 */}
              {step === 2 ? (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold">Purchase Order</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Confirmation will be set to <span className="font-semibold">false</span>. Estimated delivery date can
                    be added later.
                  </p>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-sm font-medium">Order title</label>
                      <Input
                        value={orderTitle}
                        onChange={(e) => setOrderTitle(e.target.value)}
                        placeholder="e.g. Half portion of Tile"
                        className="mt-1"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        disabled={loading || !!created.ID_Purchase === false}
                      >
                        Back
                      </Button>

                      <Button disabled={!canCreateOrder || loading} onClick={createPurchaseOrder} className="gap-2">
                        {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : null}
                        Create Purchase Order
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}

              {/* STEP 3 */}
              {step === 3 ? (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold">Purchase Order Items (Quote)</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add at least <span className="font-semibold">one</span> item for this order. Purchase fields can be
                    completed later when the order is finalized.
                  </p>

                  <div className="mt-4 rounded-lg border bg-white p-4">
                    <p className="text-sm font-semibold">
                      Current Order:{" "}
                      <span className="text-muted-foreground">{activeOrder?.Order_title ?? "—"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{activeOrder?.ID_PurchaseOrder ?? ""}</p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">Item name</label>
                        <Input
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          placeholder="e.g. 1/4 Tile"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Quote shop</label>
                        <Input
                          value={quoteShop}
                          onChange={(e) => setQuoteShop(e.target.value)}
                          placeholder="e.g. Amazon"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Quote value</label>
                        <Input
                          value={quoteValue}
                          onChange={(e) => setQuoteValue(e.target.value)}
                          placeholder="e.g. 550"
                          className="mt-1"
                          inputMode="decimal"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">Quote link</label>
                        <Input
                          value={quoteLink}
                          onChange={(e) => setQuoteLink(e.target.value)}
                          placeholder="e.g. https://www.amazon.com/..."
                          className="mt-1"
                        />
                      </div>

                      <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
                        <Button
                          disabled={!canCreateItem || loading}
                          onClick={addPurchaseOrderItem}
                          className="gap-2"
                        >
                          {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          Add Item
                        </Button>

                        <Button variant="outline" onClick={resetItemForm} disabled={loading}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* ITEMS PREVIEW */}
                  <div className="mt-6">
                    <p className="mb-2 text-sm font-semibold">Items created for this order</p>

                    <div className="space-y-2">
                      {activeOrder?.items?.length ? (
                        activeOrder.items.map((it, idx) => (
                          <Card key={(it.ID_PurchaseOrderItem ?? "") + idx} className="p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">{it.Name ?? "—"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {it.ID_PurchaseOrderItem ?? ""} · {it.Quote_shop ?? "—"} ·{" "}
                                  {money(asNumber(it.Quote_value))}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeLocalItem(created.orders.length - 1, idx)}
                                className="gap-2"
                                disabled={loading}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove (UI)
                              </Button>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <div className="rounded-lg border bg-white p-4">
                          <p className="text-sm text-muted-foreground">
                            No items yet. Add at least one item to continue.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CONTINUE FLOW */}
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>
                      Back
                    </Button>

                    <Button
                      variant="outline"
                      onClick={startNewOrder}
                      disabled={loading || (activeOrder?.items?.length ?? 0) < 1}
                    >
                      Add another Purchase Order
                    </Button>

                    <Button
                      onClick={finish}
                      disabled={loading || (activeOrder?.items?.length ?? 0) < 1}
                      className="gap-2"
                    >
                      Finish & Go to Purchases
                    </Button>

                    {(activeOrder?.items?.length ?? 0) < 1 ? (
                      <p className="text-sm text-muted-foreground">
                        Add at least 1 item to finish this order.
                      </p>
                    ) : null}
                  </div>
                </Card>
              ) : null}
            </div>

            {/* RIGHT SIDEBAR SUMMARY */}
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="mb-3 text-xl font-semibold">Progress</h2>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Purchase ID:</span>{" "}
                    {created.ID_Purchase ?? "-"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Selling Rep:</span>{" "}
                    {created.Selling_rep || "-"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Description:</span>{" "}
                    {created.Description || "-"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Status:</span>{" "}
                    {created.Status || "-"}
                  </p>

                  <div className="pt-3 space-y-2">
                    <p>
                      <span className="font-medium text-foreground">Orders:</span> {totals.ordersCount}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Items:</span> {totals.itemsCount}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Total quoted:</span> {money(totals.totalQuoted)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="mb-3 text-xl font-semibold">Orders</h2>

                <div className="space-y-3">
                  {created.orders.length ? (
                    created.orders.map((o, idx) => (
                      <div key={(o.ID_PurchaseOrder ?? "") + idx} className="rounded-lg border bg-white p-3">
                        <p className="text-sm font-semibold">{o.Order_title ?? "Untitled order"}</p>
                        <p className="text-xs text-muted-foreground">{o.ID_PurchaseOrder ?? ""}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Items: {o.items.length}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-sm text-muted-foreground">No orders created yet.</p>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="mb-3 text-xl font-semibold">Actions</h2>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setError(null)
                      router.push("/purchases")
                    }}
                  >
                    Cancel
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
