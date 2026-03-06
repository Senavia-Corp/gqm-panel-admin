"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { mockOrders } from "@/lib/mock-data/estimates"
import { DeleteOrderDialog } from "@/components/organisms/DeleteOrderDialog"
import type { SubcontractorOrder } from "@/lib/types"

export default function SubcontractorOrdersPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [orderToDelete, setOrderToDelete] = useState<SubcontractorOrder | null>(null)
  const itemsPerPage = 10

  // Filter orders for this subcontractor
  const subcontractorOrders = mockOrders.filter((order) => order.ID_Subcontractor === params.id)

  // Apply filters
  const filteredOrders = useMemo(() => {
    return subcontractorOrders.filter((order) => {
      const matchesSearch =
        order.Order_Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.ID_Order.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || order.Status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [subcontractorOrders, searchQuery, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  const handleDeleteOrder = (order: SubcontractorOrder) => {
    setOrderToDelete(order)
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground mt-1">Manage orders for this subcontractor across all jobs</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => router.push(`/subcontractors/${params.id}/orders/create`)}
                className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
              >
                <Plus className="h-4 w-4" />
                Create New Order
              </Button>
            </div>

            {paginatedOrders.length > 0 ? (
              <>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Order ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Order Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Job ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Items</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Formula</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Adj. Formula</th>
                        <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paginatedOrders.map((order) => (
                        <tr key={order.ID_Order} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{order.ID_Order}</td>
                          <td className="px-4 py-3 text-sm">{order.Order_Name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{order.ID_Jobs}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge
                              className={
                                order.Status === "Approved"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : order.Status === "Draft"
                                    ? "bg-yellow-500 hover:bg-yellow-600"
                                    : order.Status === "Completed"
                                      ? "bg-blue-500 hover:bg-blue-600"
                                      : ""
                              }
                            >
                              {order.Status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">{order.Items.length}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold">
                            ${order.Total_Builder_Cost.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold">
                            ${order.Total_Builder_Cost.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/subcontractors/${params.id}/orders/${order.ID_Order}`)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
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

                {/* Pagination */}
                <div className="mt-6 flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length}{" "}
                    orders
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No orders found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteOrderDialog
        order={orderToDelete}
        open={!!orderToDelete}
        onOpenChange={(open) => !open && setOrderToDelete(null)}
        onConfirm={() => {
          console.log("[v0] Order deleted:", orderToDelete?.ID_Order)
          setOrderToDelete(null)
        }}
      />
    </>
  )
}
