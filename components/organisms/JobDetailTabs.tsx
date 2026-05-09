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
      {/* Container with horizontal scroll and fade effect indicators */}
      <div className="relative group">
        <div 
          className={cn(
            "w-full overflow-x-auto rounded-xl border bg-white p-1.5 sm:p-2",
            "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300",
            "transition-all duration-200"
          )}
        >
          <div className="flex w-max min-w-full flex-nowrap gap-1 sm:gap-2 pr-4">
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
                    "relative h-9 rounded-lg px-3 text-xs font-medium whitespace-nowrap sm:h-10 sm:px-4 sm:text-sm",
                    "transition-all duration-200 shrink-0",
                    isActive 
                      ? "bg-gqm-green text-white hover:bg-gqm-green/90 shadow-sm" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className={cn(
                      "h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 transition-colors", 
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-500"
                    )} />
                    {tab.label}
                  </span>

                  {hasTabChanges(tab.id) && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400" />
                  )}
                </Button>
              )
            })}
          </div>
        </div>
        
        {/* Visual cue: Right fade when overflow (simulated as it's hard to detect scroll position purely with CSS, but a subtle fixed fade helps) */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-gradient-to-l from-white/50 to-transparent sm:w-12" />
      </div>
    </div>
  )
}
