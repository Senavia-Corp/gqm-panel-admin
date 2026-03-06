"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Eye } from "lucide-react"

export type CommunityClient = {
  ID_Client: string
  Client_Community?: string | null
  Address?: string | null
  Compliance_Partner?: string | null
  Phone_Number?: string | string[] | null
  Email_Address?: string | string[] | null
  Website?: string | null
  podio_item_id?: string | null
  ID_Community_Tracking?: string | null
}

type Props = {
  client: CommunityClient
  onViewDetails?: (clientId: string) => void
}

const safeWebsite = (url?: string | null) => {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`
}

export function CommunityDetailsCard({ client, onViewDetails }: Props) {
  const website = safeWebsite(client.Website)

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">
              {client.Client_Community ?? "-"}
            </h3>

            {client.Compliance_Partner ? (
              <Badge className="bg-gqm-green text-white hover:bg-gqm-green/90">
                Compliance: {client.Compliance_Partner}
              </Badge>
            ) : null}
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">ID:</span> {client.ID_Client}
            {client.ID_Community_Tracking ? (
              <>
                {" "}
                • <span className="font-medium text-foreground">Parent:</span> {client.ID_Community_Tracking}
              </>
            ) : null}
          </p>

          <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
            {client.Address ?? "-"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {website ? (
            <a href={website} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Website
              </Button>
            </a>
          ) : (
            <Button variant="outline" disabled className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Website
            </Button>
          )}

          <Button
            className="gap-2 bg-gqm-green hover:bg-gqm-green/90"
            onClick={() => onViewDetails?.(client.ID_Client)}
          >
            <Eye className="h-4 w-4" />
            View details
          </Button>
        </div>
      </div>
    </div>
  )
}
