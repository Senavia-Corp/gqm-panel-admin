import type { Job, Client, GQMMember, DashboardMetric, TimelineEvent } from "./types"

// Mock GQM Members
export const mockMembers: GQMMember[] = [
  {
    id: "M001",
    name: "John Smith",
    email: "john.smith@gqm.com",
    phone: "(555) 123-4567",
    role: "Project Manager",
    avatar: "/professional-man.jpg",
  },
  {
    id: "M002",
    name: "Sarah Johnson",
    email: "sarah.johnson@gqm.com",
    phone: "(555) 234-5678",
    role: "Senior Estimator",
    avatar: "/professional-woman-diverse.png",
  },
  {
    id: "M003",
    name: "Michael Davis",
    email: "michael.davis@gqm.com",
    phone: "(555) 345-6789",
    role: "Operations Director",
    avatar: "/professional-man-business.png",
  },
]

// Mock Clients
export const mockClients: Client[] = [
  {
    id: "C001",
    name: "Robert Williams",
    companyName: "Williams Properties LLC",
    email: "robert@williamsproperties.com",
    phone: "(555) 111-2222",
    address: "123 Main St, New York, NY 10001",
    avatar: "/business-client.png",
    status: "Active",
  },
  {
    id: "C002",
    name: "Emily Brown",
    companyName: "Brown Real Estate Group",
    email: "emily@brownrealestate.com",
    phone: "(555) 222-3333",
    address: "456 Park Ave, Los Angeles, CA 90001",
    avatar: "/business-woman-client.jpg",
    status: "Active",
  },
  {
    id: "C003",
    name: "James Martinez",
    companyName: "Martinez Construction",
    email: "james@martinezconstruction.com",
    phone: "(555) 333-4444",
    address: "789 Oak St, Chicago, IL 60601",
    avatar: "/construction-client.jpg",
    status: "Active",
  },
]

// Mock Jobs
export const mockJobs: Job[] = [
  {
    id: "QID50001",
    jobType: "QID",
    projectName: "Office Building Restoration",
    projectLocation: "123 Main St, New York, NY 10001",
    status: "Scheduled/Work in progress",
    poWtnWo: "PO-2025-001",
    serviceType: "Complete Building Restoration",
    dateAssigned: "2025-01-15",
    estimatedStartDate: "2025-02-01",
    estimatedDuration: "3 months",
    client: mockClients[0],
    representative: mockMembers[0],
    createdAt: "2025-01-15",
  },
  {
    id: "PTL50002",
    jobType: "PTL",
    projectName: "Apartment Complex Roof Repair",
    projectLocation: "456 Park Ave, Los Angeles, CA 90001",
    status: "Assigned/P.Quote",
    poWtnWo: "WTN-2025-002",
    serviceType: "Roof Repair & Waterproofing",
    dateAssigned: "2025-01-18",
    estimatedStartDate: "2025-02-15",
    estimatedDuration: "2 months",
    client: mockClients[1],
    representative: mockMembers[1],
    createdAt: "2025-01-18",
  },
  {
    id: "PAR50003",
    jobType: "PAR",
    projectName: "Commercial Kitchen Renovation",
    projectLocation: "789 Oak St, Chicago, IL 60601",
    status: "Waiting for Approval",
    poWtnWo: "WO-2025-003",
    serviceType: "Kitchen Renovation",
    dateAssigned: "2025-01-20",
    estimatedStartDate: "2025-03-01",
    estimatedDuration: "1.5 months",
    client: mockClients[2],
    representative: mockMembers[2],
    createdAt: "2025-01-20",
  },
  {
    id: "QID50004",
    jobType: "QID",
    projectName: "Hotel Water Damage Restoration",
    projectLocation: "321 Beach Blvd, Miami, FL 33101",
    status: "Invoiced",
    poWtnWo: "PO-2025-004",
    serviceType: "Water Damage Restoration",
    dateAssigned: "2025-01-10",
    estimatedStartDate: "2025-01-20",
    estimatedDuration: "2 months",
    client: mockClients[0],
    representative: mockMembers[0],
    createdAt: "2025-01-10",
  },
  {
    id: "PTL50005",
    jobType: "PTL",
    projectName: "Shopping Mall HVAC Installation",
    projectLocation: "654 Commerce Dr, Houston, TX 77001",
    status: "Scheduled/Work in progress",
    poWtnWo: "WTN-2025-005",
    serviceType: "HVAC System Installation",
    dateAssigned: "2025-01-12",
    estimatedStartDate: "2025-01-25",
    estimatedDuration: "4 months",
    client: mockClients[1],
    representative: mockMembers[1],
    createdAt: "2025-01-12",
  },
]

// Mock Timeline Events
export const mockTimelineEvents: TimelineEvent[] = [
  {
    id: "T001",
    activity: "Job created",
    date: "2025-01-15",
    user: "John Smith",
  },
  {
    id: "T002",
    activity: "Client information updated",
    date: "2025-01-16",
    user: "Sarah Johnson",
  },
  {
    id: "T003",
    activity: 'Status changed to "Assigned/P.Quote"',
    date: "2025-01-17",
    user: "John Smith",
  },
  {
    id: "T004",
    activity: "Estimate sent to client",
    date: "2025-01-18",
    user: "John Smith",
  },
  {
    id: "T005",
    activity: 'Status changed to "Scheduled/Work in progress"',
    date: "2025-01-20",
    user: "Michael Davis",
  },
]

// Mock Dashboard Metrics
export const mockDashboardMetrics: DashboardMetric[] = [
  { name: "Total Jobs", value: "156", change: 12.5 },
  { name: "Active Jobs", value: "42", change: 8.3 },
  { name: "Completed This Month", value: "28", change: 15.2 },
  { name: "Total Revenue", value: "$2.4M", change: 10.7 },
  { name: "Pending Approvals", value: "8", change: -5.2 },
]

// Demo user credentials
export const DEMO_USERS = {
  gqmMember: {
    email: "admin@gqm.com",
    password: "demo123",
    userData: {
      id: "U001",
      name: "Admin User",
      email: "admin@gqm.com",
      role: "GQM_MEMBER" as const,
      avatar: "/admin-user-interface.png",
    },
  },
  leadTechnician: {
    email: "tech@gqm.com",
    password: "tech123",
    userData: {
      id: "TECH50001",
      name: "Carlos Rodriguez",
      email: "tech@gqm.com",
      role: "LEAD_TECHNICIAN" as const,
      avatar: "/placeholder.svg?height=40&width=40",
    },
  },
}

// Keep for backward compatibility
export const DEMO_USER = DEMO_USERS.gqmMember

// Mock recent tasks for Lead Technician dashboard
export const mockRecentTasks = [
  {
    id: "TASK001",
    name: "Install Kitchen Cabinets",
    status: "In Process",
    jobId: "QID50001",
    jobName: "Unit 302 - Bathroom Countertop",
  },
  {
    id: "TASK002",
    name: "Measure Countertop Dimensions",
    status: "Completed",
    jobId: "QID50001",
    jobName: "Unit 302 - Bathroom Countertop",
  },
  {
    id: "TASK003",
    name: "Final Quality Inspection",
    status: "Assigned",
    jobId: "QID50002",
    jobName: "Office Building Restoration",
  },
]

// Mock weekly tasks for Lead Technician dashboard
export const mockWeeklyTasks = [
  {
    id: "TASK004",
    name: "UI Design",
    status: "Completed",
    startDate: "2025-01-26",
    duration: 2,
    jobId: "QID50001",
    jobName: "Unit 302 - Bathroom Countertop",
  },
  {
    id: "TASK005",
    name: "Design System",
    status: "In Process",
    startDate: "2025-01-28",
    duration: 2,
    jobId: "QID50002",
    jobName: "Office Building Restoration",
  },
  {
    id: "TASK006",
    name: "Cabinet Installation",
    status: "Assigned",
    startDate: "2025-01-25",
    duration: 1,
    jobId: "QID50001",
    jobName: "Unit 302 - Bathroom Countertop",
  },
]
