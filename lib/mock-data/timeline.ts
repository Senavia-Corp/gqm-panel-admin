import type { TimelineEvent } from "@/lib/types"

export const mockTimelineEvents: TimelineEvent[] = [
  {
    id: "TL001",
    activity: "Job created",
    date: "14/1/2025",
    user: "Admin",
  },
  {
    id: "TL002",
    activity: "Client information updated",
    date: "15/1/2025",
    user: "Admin",
  },
  {
    id: "TL003",
    activity: 'Status changed to "Assigned/P.Quote"',
    date: "16/1/2025",
    user: "Manager",
  },
  {
    id: "TL004",
    activity: "Estimate sent to client",
    date: "17/1/2025",
    user: "Sales Team",
  },
  {
    id: "TL005",
    activity: "Subcontractor assigned",
    date: "18/1/2025",
    user: "Project Manager",
  },
  {
    id: "TL006",
    activity: "Work started",
    date: "20/1/2025",
    user: "Subcontractor",
  },
  {
    id: "TL007",
    activity: "Order created",
    date: "21/1/2025",
    user: "Project Manager",
  },
  {
    id: "TL008",
    activity: "Payment processed",
    date: "25/1/2025",
    user: "Finance Team",
  },
  {
    id: "TL009",
    activity: "Inspection completed",
    date: "28/1/2025",
    user: "Inspector",
  },
  {
    id: "TL010",
    activity: "Project milestone reached",
    date: "30/1/2025",
    user: "Project Manager",
  },
]
