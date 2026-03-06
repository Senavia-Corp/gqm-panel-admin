"use client"

import { Eye, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { ClientDetails } from "@/lib/types"

interface ClientsTableProps {
  clients: ClientDetails[]
  onDelete: (client: ClientDetails) => void
}

export function ClientsTable({ clients, onDelete }: ClientsTableProps) {
  const router = useRouter()

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "Low":
        return "bg-green-100 text-green-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "High":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusBadgeColor = (status: string) => {
    return status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
  }

  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client Community</TableHead>
            <TableHead>Parent Mgmt Company</TableHead>
            <TableHead>Parent Company</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Property Manager</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                No clients found
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <TableRow key={client.ID_Client}>
                <TableCell className="font-medium">{client.Client_Community}</TableCell>
                <TableCell>{client.Parent_Mgmt_Company}</TableCell>
                <TableCell>{client.Parent_Company}</TableCell>
                <TableCell className="max-w-xs truncate">{client.Address}</TableCell>
                <TableCell>{client.Prop_Manager}</TableCell>
                <TableCell>{client.Email_Address}</TableCell>
                <TableCell>
                  <Badge className={getRiskBadgeColor(client.Risk_Value)}>{client.Risk_Value}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadgeColor(client.Client_Status)}>{client.Client_Status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-yellow-100 hover:bg-yellow-200"
                      onClick={() => router.push(`/clients/${client.ID_Client}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-gray-800 hover:bg-gray-900 text-white"
                      onClick={() => onDelete(client)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
