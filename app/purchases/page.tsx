"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Eye, ChevronLeft, ChevronRight } from "lucide-react"

type PurchaseOrderItem = {
  ID_PurchaseOrderItem?: string | null
  Name?: string | null
  Quote_value?: number | null
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
  ID_Purchase: string
  Selling_rep?: string | null
  Description?: string | null
  Status?: "In Progress" | "Completed" | string | null
  Total_spending?: number | null
  purchase_orders?: PurchaseOrder[] | null
}

type PurchaseListResponse =
  | {
      results: Purchase[]
      total?: number
      page?: number
      limit?: number
    }
  | Purchase[]

const ITEMS_PER_PAGE = 10

const asString = (v: unknown) => (v == null ? "" : String(v))

const toNumber = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

const sumPurchaseMetrics = (p: Purchase) => {
  const orders = Array.isArray(p.purchase_orders) ? p.purchase_orders : []
  const items = orders.flatMap((o) => (Array.isArray(o.porder_items) ? o.porder_items : []))
  const quoteTotal = items.reduce((acc, it) => acc + toNumber(it?.Quote_value), 0)
  const spentFromItems = items.reduce((acc, it) => acc + toNumber(it?.Purchase_value), 0)
  const itemCount = items.length
  const orderCount = orders.length
  const spent = p.Total_spending != null ? toNumber(p.Total_spending) : spentFromItems

  return { orderCount, itemCount, quoteTotal, spent }
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)

const statusBadgeClass = (status?: string | null) => {
  if (status === "Completed") return "bg-green-500 hover:bg-green-600"
  if (status === "In Progress") return "bg-yellow-500 hover:bg-yellow-600"
  return "bg-gray-400 hover:bg-gray-500"
}

export default function PurchasesPage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState<number>(0)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "In Progress" | "Completed">("all")

  const fetchPurchases = async (nextPage: number) => {
    try {
      setLoading(true)
      setLoadError(null)

      const res = await fetch(`/api/purchases?page=${nextPage}&limit=${ITEMS_PER_PAGE}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch purchases (${res.status})`)

      const data = (await res.json()) as PurchaseListResponse

      const list = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []
      const totalValue = Array.isArray(data) ? list.length : typeof data.total === "number" ? data.total : list.length

      setPurchases(list)
      setTotal(totalValue)
      setPage(nextPage)
    } catch (e: any) {
      console.error("Error fetching purchases:", e)
      setPurchases([])
      setTotal(0)
      setLoadError(e?.message ?? "Failed to load purchases")
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
    fetchPurchases(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchPurchases(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter])

  const filteredPurchases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return purchases.filter((p) => {
      const matchesSearch =
        !q ||
        asString(p.ID_Purchase).toLowerCase().includes(q) ||
        asString(p.Selling_rep).toLowerCase().includes(q) ||
        asString(p.Description).toLowerCase().includes(q)

      const matchesStatus = statusFilter === "all" || asString(p.Status) === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [purchases, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Purchases</h1>
              <p className="text-sm text-muted-foreground">Track quotes and completed spending for project purchases.</p>
            </div>

            <Button onClick={() => router.push("/purchases/create")} className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90">
              <Plus className="h-4 w-4" />
              Add New Purchase
            </Button>
          </div>

          <Card className="p-6">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative sm:w-96">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, selling rep or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                Total: <span className="font-medium text-foreground">{total}</span>
              </div>
            </div>

            {loading ? (
              <div className="flex h-56 items-center justify-center rounded-lg border bg-white">
                <p className="text-gray-500">Loading purchases...</p>
              </div>
            ) : loadError ? (
              <div className="rounded-lg border bg-white p-6">
                <h2 className="text-lg font-semibold">Purchases could not be loaded</h2>
                <p className="mt-2 text-sm text-red-600">{loadError}</p>
                <div className="mt-4">
                  <Button onClick={() => fetchPurchases(page)}>Retry</Button>
                </div>
              </div>
            ) : filteredPurchases.length ? (
              <>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Selling Rep</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">P. Orders</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Items</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Quoted</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Spent</th>
                        <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {filteredPurchases.map((p) => {
                        const { orderCount, itemCount, quoteTotal, spent } = sumPurchaseMetrics(p)

                        return (
                          <tr key={p.ID_Purchase} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium">{p.ID_Purchase}</td>
                            <td className="px-4 py-3 text-sm">{asString(p.Selling_rep) || "-"}</td>
                            <td className="px-4 py-3 text-sm">{asString(p.Description) || "-"}</td>
                            <td className="px-4 py-3 text-sm">
                              <Badge className={statusBadgeClass(p.Status)}>{asString(p.Status) || "Unknown"}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">{orderCount}</td>
                            <td className="px-4 py-3 text-sm text-right">{itemCount}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">{formatMoney(quoteTotal)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">{formatMoney(spent)}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/purchases/${p.ID_Purchase}`)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page <span className="font-medium text-foreground">{page}</span> of{" "}
                    <span className="font-medium text-foreground">{totalPages}</span>
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchPurchases(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchPurchases(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No purchases found</p>
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  )
}
