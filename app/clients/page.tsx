"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Search, ChevronLeft, ChevronRight, Eye, Trash2 } from "lucide-react"

interface ParentMgmtCo {
  ID_Community_Tracking: string
  Property_mgmt_co: string | null
  Company_abbrev: string | null
  Main_office_hq: string | null
  Main_office_email: string | null
  Main_office_number: string | null
  State: string | null
  podio_item_id: string | null
  clients?: any[]
  managers?: any[]
}

export default function ClientsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  const [items, setItems] = useState<ParentMgmtCo[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ParentMgmtCo | null>(null)

  const itemsPerPage = 10

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
    fetchParentMgmtCo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const fetchParentMgmtCo = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/parent_mgmt_co", { cache: "no-store" })
      const data = await response.json()
      setItems(data.results || [])
    } catch (error) {
      console.error("Error fetching parent mgmt co:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return items

    return items.filter((x) => {
      const haystack = [
        x.Property_mgmt_co,
        x.Company_abbrev,
        x.ID_Community_Tracking,
        x.Main_office_hq,
        x.Main_office_email,
        x.Main_office_number,
        x.State,
        x.podio_item_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [items, searchQuery])

  const handleDelete = (row: ParentMgmtCo) => {
    setItemToDelete(row)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      const response = await fetch(`/api/parent_mgmt_co/${itemToDelete.ID_Community_Tracking}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setItems((prev) => prev.filter((x) => x.ID_Community_Tracking !== itemToDelete.ID_Community_Tracking))
        setDeleteDialogOpen(false)
        setItemToDelete(null)
      } else {
        const err = await response.text().catch(() => "")
        console.error("Delete failed:", response.status, err)
      }
    } catch (error) {
      console.error("Error deleting parent mgmt co:", error)
    }
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => {
    // si cambia el filtro/busqueda, resetea a page 1
    setCurrentPage(1)
  }, [searchQuery])

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <h1 className="mb-6 text-3xl font-bold">Parent Management Companies</h1>

          <div className="space-y-4">
            <div className="rounded-lg border bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">All Parent Mgmt Co</h2>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-xs font-semibold text-white">
                    {filteredItems.length}
                  </span>
                </div>

                {/* Mantengo el botón por coherencia, pero probablemente cambiará a "Add Parent Mgmt Co" */}
                <Button onClick={() => router.push("/clients/create")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add New
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search parent management companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center rounded-lg border bg-white">
                <p className="text-gray-500">Loading parent management companies...</p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-lg border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="pl-6 font-semibold">ID</TableHead>
                        <TableHead className="font-semibold">Company</TableHead>
                        <TableHead className="font-semibold">Abbrev</TableHead>
                        <TableHead className="font-semibold">HQ Address</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Phone</TableHead>
                        <TableHead className="font-semibold">Podio</TableHead>
                        <TableHead className="pr-6 text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {paginatedItems.map((row) => (
                        <TableRow key={row.ID_Community_Tracking}>
                          <TableCell className="pl-6 font-medium">{row.ID_Community_Tracking}</TableCell>
                          <TableCell>{row.Property_mgmt_co || "-"}</TableCell>
                          <TableCell>{row.Company_abbrev || "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{row.Main_office_hq || "-"}</TableCell>
                          <TableCell className="max-w-[220px] truncate">{row.Main_office_email || "-"}</TableCell>
                          <TableCell className="max-w-[180px] truncate">{row.Main_office_number || "-"}</TableCell>
                          <TableCell>{row.podio_item_id || "-"}</TableCell>

                          <TableCell className="pr-6 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 bg-yellow-500 text-white hover:bg-yellow-600"
                                onClick={() => router.push(`/clients/${row.ID_Community_Tracking}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 bg-gray-800 text-white hover:bg-gray-900"
                                onClick={() => handleDelete(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {paginatedItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="py-10 text-center text-sm text-gray-500">
                            No parent management companies found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-white p-4">
                  <div className="text-sm text-gray-600">
                    Showing {filteredItems.length === 0 ? 0 : startIndex + 1} to{" "}
                    {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} records
                  </div>

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

                    <span className="text-sm font-medium">
                      Page {Math.min(currentPage, totalPages)} of {totalPages}
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
            )}
          </div>
        </main>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Parent Management Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{itemToDelete?.Property_mgmt_co || itemToDelete?.ID_Community_Tracking}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
