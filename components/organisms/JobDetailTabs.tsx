"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  FileText,
  Users,
  MessageSquare,
  DollarSign,
  UserCircle2,
  ClipboardList,
  Calculator,
  Briefcase,
} from "lucide-react"

type TabDef = { id: string; label: string }

type JobDetailTabsProps = {
  tabs: TabDef[]
  activeTab: string
  onChange: (tabId: string) => void
  hasTabChanges: (tabId: string) => boolean
}

const tabIconById: Record<string, React.ComponentType<{ className?: string }>> = {
  details: FileText,
  subcontractors: Users,
  documents: FileText,
  chat: MessageSquare,
  pricing: DollarSign,
  members: UserCircle2,
  tasks: ClipboardList,
  estimate: Calculator,

  // fallback / futuros
  default: Briefcase,
}

export function JobDetailTabs({ tabs, activeTab, onChange, hasTabChanges }: JobDetailTabsProps) {
  return (
    <div className="mb-6">
      {/* w-fit evita el espacio en blanco, max-w-full + overflow-x-auto evita que reviente en pantallas pequeñas */}
      <div className="inline-flex max-w-full overflow-x-auto rounded-xl border bg-white p-2">
        <div className="flex flex-nowrap gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tabIconById[tab.id] ?? tabIconById.default

            return (
              <Button
                key={tab.id}
                type="button"
                variant={isActive ? "default" : "ghost"}
                onClick={() => onChange(tab.id)}
                className={cn(
                  "relative h-10 rounded-lg px-4 text-sm font-medium whitespace-nowrap",
                  isActive ? "bg-gqm-green text-white hover:bg-gqm-green/90" : "hover:bg-gray-100",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-muted-foreground")} />
                  {tab.label}
                </span>

                {hasTabChanges(tab.id) && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-yellow-400" />
                )}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
