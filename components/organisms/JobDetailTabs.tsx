"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  FileText,
  Users,
  DollarSign,
  UserCircle2,
  ClipboardList,
  Calculator,
  Briefcase,
  BadgeDollarSign,
  Activity,
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
  chat: ClipboardList,
  pricing: DollarSign,
  members: UserCircle2,
  tasks: ClipboardList,
  estimate: Calculator,
  commissions: BadgeDollarSign,
  timeline: Activity,

  // fallback / futuros
  default: Briefcase,
}

export function JobDetailTabs({ tabs, activeTab, onChange, hasTabChanges }: JobDetailTabsProps) {
  return (
    <div className="mb-4 sm:mb-6">
      {/* w-full + overflow-x-auto enables proper touch-scroll on mobile */}
      <div className="w-full overflow-x-auto rounded-xl border bg-white p-1.5 sm:p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full flex-nowrap gap-1 sm:gap-2">
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
                  "relative h-9 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap sm:h-10 sm:px-4 sm:text-sm",
                  isActive ? "bg-gqm-green text-white hover:bg-gqm-green/90" : "hover:bg-gray-100",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon className={cn("h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4", isActive ? "text-white" : "text-muted-foreground")} />
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
