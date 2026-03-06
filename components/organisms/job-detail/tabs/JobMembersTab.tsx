"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MapPin, Trash2, Link2 } from "lucide-react"
import type { UserRole } from "@/lib/types"

type Props = {
  role: UserRole
  job: any
  onOpenLinkMember?: () => void
  onRequestUnlinkMember?: (payload: { memberId: string; name?: string }) => void
}

function avatarColorFor(name: string) {
  const colors = ["bg-green-500", "bg-blue-500", "bg-indigo-500", "bg-yellow-500", "bg-pink-500", "bg-teal-500"]
  if (!name) return colors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i)
  return colors[Math.abs(hash) % colors.length]
}

function initialsOf(name?: string) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function JobMembersTab({ role, job, onOpenLinkMember, onRequestUnlinkMember }: Props) {
  const members = Array.isArray(job?.members) ? job.members : []

  return (
    <div className="space-y-4">
      {/* Header + CTA */}
      {role === "GQM_MEMBER" && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Members</h3>
            <p className="text-sm text-muted-foreground">Manage members linked to this job</p>
          </div>

          <Button onClick={onOpenLinkMember} className="bg-gqm-green hover:bg-gqm-green/90">
            <Link2 className="mr-2 h-4 w-4" />
            Link Member
          </Button>
        </div>
      )}

      {members.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No members assigned to this job yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {members.map((member: any, index: number) => {
            const name = member.Member_Name || member.Acc_Rep || "Unknown"
            const memberId = member.ID_Member || `member-${index}`
            const companyRole = member.Company_Role || "—"
            const projectRole = member.rol || member.Rol || "—"
            const email = member.Email_Address || member.Email || ""
            const phone = member.Phone_Number || member.Phone || ""
            const address = member.Address || ""

            const bg = avatarColorFor(String(name))

            return (
              <Card key={memberId} className="flex items-stretch">
                <CardContent className="flex w-full items-start gap-4 p-6">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full text-white ${bg} shrink-0`}>
                      <div className="text-lg font-semibold">{initialsOf(name)}</div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold">{name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Company role: <span className="font-medium text-foreground">{companyRole}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Project role: <span className="font-medium text-foreground">{projectRole}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">ID: {memberId}</div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {role === "GQM_MEMBER" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRequestUnlinkMember?.({ memberId, name })}
                            aria-label={`Remove member ${name}`}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground break-words">
                        <Mail className="h-4 w-4" />
                        {email ? (
                          <a className="text-sm text-blue-600 hover:underline" href={`mailto:${email}`}>
                            {email}
                          </a>
                        ) : (
                          <span>—</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground break-words">
                        <Phone className="h-4 w-4" />
                        <span>{phone || "—"}</span>
                      </div>

                      {address ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground break-words">
                          <MapPin className="h-4 w-4" />
                          <span>{address}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}