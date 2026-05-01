"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import type { Technician, Subcontractor, Client, TimelineEvent } from "@/lib/types"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { ClientCard } from "./ClientCard"
import { TimelineItem } from "../molecules/TimelineItem"
import { useTranslations } from "@/components/providers/LocaleProvider"

interface TechnicianDetailsProps {
  technician: Technician
  subcontractor: Subcontractor
  onBack: () => void
  client: Client
  timelineEvents: TimelineEvent[]
}

export function TechnicianDetails({
  technician,
  subcontractor,
  onBack,
  client,
  timelineEvents,
}: TechnicianDetailsProps) {
  const t = useTranslations("subcontractors")
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Content */}
      <div className="space-y-6 lg:col-span-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("backToSub")}
          </Button>
          <Button className="bg-black hover:bg-black/90 text-white" disabled>
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("goToTechPage")}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Technician Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl">{technician.Name}</CardTitle>
                    <Badge
                      className={`${
                        (technician.Type_of_technician || technician.Type) === "Leader"
                          ? "bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/80"
                          : "bg-blue-500 hover:bg-blue-600"
                      } text-base px-3 py-1`}
                    >
                      {t((technician.Type_of_technician || technician.Type || "worker").toLowerCase())}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {technician.ID_Technician} • {subcontractor.Name}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("generalInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block text-sm font-bold">{t("location")}</Label>
                <p className="text-base">{technician.Location}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("contactInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-sm font-bold">{t("email")}</Label>
                  <p className="text-base">{technician.Email_Address || technician.Email}</p>
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-bold">{t("phoneNumber")}</Label>
                  <p className="text-base">{technician.Phone_Number || technician.Phone_number}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <ClientCard client={client} />

        <Card>
          <CardHeader>
            <CardTitle>{t("timeline")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {timelineEvents.map((event) => (
              <TimelineItem key={event.id} activity={event.activity} date={new Date(event.date).toLocaleDateString()} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
