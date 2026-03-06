"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ExternalLink, RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

type Client = {
  ID_Client: string
  Client_Community?: string | null
  Address?: string | null
  Compliance_Partner?: string | null
  Phone_Number?: string | string[] | null
  Email_Address?: string | string[] | null
  Website?: string | null
  Invoice_Collection?: string | null
  Collection_Process?: string | null
  Maintenance_Sup?: string | null
  Payment_Collection?: string | null
  Text?: string | null
  podio_item_id?: string | null
  ID_Community_Tracking?: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string | null
}

const asArray = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === "string") return value ? [value] : []
  return [String(value)]
}

const safeWebsite = (url?: string | null) => {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`
}

export function CommunityDetailsModal({ open, onOpenChange, clientId }: Props) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [client, setClient] = React.useState<Client | null>(null)

  const fetchClient = React.useCallback(async () => {
    if (!clientId) return
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/clients/${clientId}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch community (${res.status})`)

      const data = (await res.json()) as Client
      setClient({
        ...data,
        ID_Client: data.ID_Client ?? clientId
      })
    } catch (e: any) {
      setClient(null)
      setError(e?.message ?? "Failed to load community")
      toast({
        title: "Error",
        description: "Failed to load community details",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [clientId])

  // Cargar cada vez que se abre con un ID válido
  React.useEffect(() => {
    if (open && clientId) fetchClient()
  }, [open, clientId, fetchClient])

  // Reset al cerrar
  React.useEffect(() => {
    if (!open) {
      setClient(null)
      setError(null)
      setLoading(false)
    }
  }, [open])

  const emails = asArray(client?.Email_Address)
  const phones = asArray(client?.Phone_Number)
  const website = safeWebsite(client?.Website)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Community Details</DialogTitle>
        </DialogHeader>

        {!clientId ? (
          <p className="text-sm text-muted-foreground">No community selected.</p>
        ) : loading ? (
          <div className="py-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">Loading community...</p>
          </div>
        ) : error ? (
          <Card className="p-4">
            <p className="text-sm font-medium">Community could not be loaded</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <div className="mt-4">
              <Button onClick={fetchClient} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </Card>
        ) : client ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{client.Client_Community ?? "-"}</h3>
                <p className="text-sm text-muted-foreground">
                  ID: {client.ID_Client} {client.ID_Community_Tracking ? `• Parent: ${client.ID_Community_Tracking}` : ""}
                </p>
              </div>

              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                >
                  Website <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4">
                <p className="text-sm font-semibold">Address</p>
                <p className="mt-1 text-sm text-muted-foreground">{client.Address ?? "-"}</p>
              </Card>

              <Card className="p-4">
                <p className="text-sm font-semibold">Compliance Partner</p>
                <p className="mt-1 text-sm text-muted-foreground">{client.Compliance_Partner ?? "-"}</p>
              </Card>

              <Card className="p-4">
                <p className="text-sm font-semibold">Phone</p>
                <p className="mt-1 text-sm text-muted-foreground">{phones.length ? phones.join(", ") : "-"}</p>
              </Card>

              <Card className="p-4">
                <p className="text-sm font-semibold">Email</p>
                <p className="mt-1 text-sm text-muted-foreground">{emails.length ? emails.join(", ") : "-"}</p>
              </Card>

              <Card className="p-4 md:col-span-2">
                <p className="text-sm font-semibold">Invoice Collection</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{client.Invoice_Collection ?? "-"}</p>
              </Card>

              <Card className="p-4 md:col-span-2">
                <p className="text-sm font-semibold">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{client.Text ?? "-"}</p>
              </Card>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
