import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserAvatar } from "@/components/atoms/UserAvatar"
import type { Client } from "@/lib/types"
import { Mail, Phone, MapPin, BadgeCheck, Building2 } from "lucide-react"

interface ClientCardProps {
  client: Client
  title?: string
}

export function ClientCard({ client, title = "Client Information" }: ClientCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            role="img"
            aria-label={client.clientCommunity ?? "Client"}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gqm-green/10 ring-1 ring-gqm-green/20 text-gqm-green-dark"
          >
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold">{client.clientCommunity}</h3>
            <p className="text-sm text-muted-foreground">{client.id}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="font-medium text-muted-foreground">Services:</span>
            <span>{client.servicesInterestedIn}</span>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span>{client.address}</span>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{client.phone}</span>
          </div>

          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{client.email}</span>
          </div>

          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-muted-foreground" />
            <span>Status: {client.status}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
