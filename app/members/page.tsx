"use client"

import { useEffect, useState } from "react"
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
import type { MemberDetails } from "@/lib/types"

export default function MembersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [members, setMembers] = useState<MemberDetails[]>([])
  const [filteredMembers, setFilteredMembers] = useState<MemberDetails[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<MemberDetails | null>(null)
  const itemsPerPage = 10

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
    fetchMembers()
  }, [router])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/members")
      const data = await response.json()
      setMembers(data.results || [])
      setFilteredMembers(data.results || [])
    } catch (error) {
      console.error("Error fetching members:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = [...members]

    if (searchQuery) {
      filtered = filtered.filter(
        (member) =>
          member.Acc_Rep?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.Email_Address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.Phone_Number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.ID_Member?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.Address?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    setFilteredMembers(filtered)
    setCurrentPage(1)
  }, [searchQuery, members])

  const handleDelete = (member: MemberDetails) => {
    setMemberToDelete(member)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!memberToDelete) return

    try {
      const response = await fetch(`/api/members/${memberToDelete.ID_Member}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMembers(members.filter((m) => m.ID_Member !== memberToDelete.ID_Member))
        setDeleteDialogOpen(false)
        setMemberToDelete(null)
      }
    } catch (error) {
      console.error("Error deleting member:", error)
    }
  }

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + itemsPerPage)

  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <h1 className="mb-6 text-3xl font-bold">GQM Members</h1>

          <div className="space-y-4">
            <div className="rounded-lg border bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">All Members</h2>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-xs font-semibold text-white">
                    {filteredMembers.length}
                  </span>
                </div>
                <Button onClick={() => router.push("/members/create")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Member
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center rounded-lg border bg-white">
                <p className="text-gray-500">Loading members...</p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-lg border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="pl-6 font-semibold">ID</TableHead>
                        <TableHead className="font-semibold">Acc Rep</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Phone</TableHead>
                        <TableHead className="font-semibold">Address</TableHead>
                        <TableHead className="pr-6 text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMembers.map((member) => (
                        <TableRow key={member.ID_Member}>
                          <TableCell className="pl-6 font-medium">{member.ID_Member}</TableCell>
                          <TableCell>{member.Acc_Rep}</TableCell>
                          <TableCell>{member.Email_Address}</TableCell>
                          <TableCell>{member.Phone_Number}</TableCell>
                          <TableCell className="max-w-xs truncate">{member.Address}</TableCell>
                          <TableCell className="pr-6 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 bg-yellow-500 text-white hover:bg-yellow-600"
                                onClick={() => router.push(`/members/${member.ID_Member}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 bg-gray-800 text-white hover:bg-gray-900"
                                onClick={() => handleDelete(member)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-white p-4">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredMembers.length)} of{" "}
                    {filteredMembers.length} members
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
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
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {memberToDelete?.Acc_Rep}? This action cannot be undone.
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
