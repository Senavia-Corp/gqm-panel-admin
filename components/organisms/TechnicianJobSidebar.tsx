"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Home, MapPin, Phone, Mail, Globe, Building2, Briefcase, CheckCircle2, User } from "lucide-react"
import { TimelineItem } from "@/components/molecules/TimelineItem"
import { mockTimelineEvents } from "@/lib/mock-data"

interface TechnicianJobSidebarProps {
  job: any
  subcontractor: any
}

export function TechnicianJobSidebar({ job, subcontractor }: TechnicianJobSidebarProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-full bg-gray-100">
              <Home className="h-6 w-6 text-gray-700" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">{job?.client?.companyName || "Unknown Company"}</p>
              <p className="text-sm text-muted-foreground">Parent Mgmt Company</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Project Name:</p>
                <p className="text-sm">{job?.projectName || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Job Status:</p>
                <p className="text-sm">{job?.status || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Service Type:</p>
                <p className="text-sm">{job?.serviceType || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Project Location:</p>
                <p className="text-sm">{job?.projectLocation || "N/A"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {subcontractor && (
        <Card>
          <CardHeader>
            <CardTitle>Subcontractor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-full bg-gray-100">
                <User className="h-6 w-6 text-gray-700" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">{subcontractor.Name}</p>
                <p className="text-sm text-muted-foreground">{subcontractor.ID_Subcontractor}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className="bg-gqm-yellow text-gqm-green-dark hover:bg-gqm-yellow/80">
                  Score: {subcontractor.Score}
                </Badge>
                <Badge
                  variant={subcontractor.State === "Active" ? "default" : "secondary"}
                  className={`${subcontractor.State === "Active" ? "bg-green-500 hover:bg-green-600" : ""}`}
                >
                  {subcontractor.State}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Organization:</p>
                  <p className="text-sm">{subcontractor.Organization || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Email:</p>
                  <p className="text-sm">{subcontractor.Email_Address || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Phone:</p>
                  <p className="text-sm">{subcontractor.Phone_Number || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Address:</p>
                  <p className="text-sm">{subcontractor.Address || "N/A"}</p>
                </div>
              </div>

              {subcontractor.Organization_Website && (
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Website:</p>
                    <a
                      href={`https://${subcontractor.Organization_Website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {subcontractor.Organization_Website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockTimelineEvents.map((event) => (
            <TimelineItem key={event.id} activity={event.activity} date={new Date(event.date).toLocaleDateString()} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
