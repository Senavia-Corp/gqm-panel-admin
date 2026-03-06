// Core data types for the GQM Admin Panel

export type JobStatus =
  | "Assigned/P. Quote"
  | "Waiting for Approval"
  | "Scheduled / Work in Progress"
  | "Cancelled"
  | "Completed P. INV / POs"
  | "Invoiced"
  | "HOLD"
  | "PAID"
  | "Warranty"
  | "Received-Stand By"
  | "Assigned-In progress"
  | "Completed PVI"
  | "Paid"
  | "In Progress"
  | "Completed PVI / POs"
  | "Archived"

export type JobType = "QID" | "PTL" | "PAR"

export interface GQMMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  avatar: string
}

export interface MemberDetails {
  ID_Member: string
  Acc_Rep: string
  Email_Address: string
  Phone_Number: string
  Address: string
  Password?: string // Not returned in GET, only used for creation
  jobs?: any[]
}

export type PythonDateString = string

export type ClientStatus = "Active" | "Inactive"
export type RiskValue = "Low" | "Medium" | "High"
export type ServicesInterestedIn = "Rehabs" | "Work Orders"

export interface ClientDetails {
  ID_Client: string
  Client_Community: string
  Parent_Mgmt_Company: string
  Parent_Company: string
  Address: string
  Website: string
  Invoice_Collection: string
  Compliance_Partner: "Yes" | "No"
  Risk_Value: RiskValue
  Prop_Manager: string
  Email_Address: string
  Phone_Number: string
  Client_Status: ClientStatus
  Services_interested_in: ServicesInterestedIn
  jobs?: any[]
  property_manager?: any[]
  property_mgmt_co?: any
}

export interface Client {
  id: string
  name: string
  companyName: string
  email: string
  phone: string
  address: string
  avatar: string
  status: string
  clientCommunity?: string
  parentMgmtCompany?: string
  parentCompany?: string
  website?: string
  invoiceCollection?: string
  compliancePartner?: "Yes" | "No"
  riskValue?: RiskValue
  propManager?: string
  clientStatus?: ClientStatus
  servicesInterestedIn?: ServicesInterestedIn
  jobs?: any[]
  propertyManager?: any[]
  propertyMgmtCo?: any
}

export interface JobDTO {
  // PKs / Identificadores
  ID_Jobs: string | null
  podio_item_id: string | null
  ID_Client?: string | null

  // Core fields
  Job_type: JobType
  Project_name: string | null
  Project_location: string | null
  Job_status: JobStatus | string | null
  Po_wtn_wo: string | null
  Service_type: string | null

  Date_assigned: PythonDateString | null
  Estimated_start_date: PythonDateString | null
  Estimated_project_duration: string | null
  Date_Received: PythonDateString | null
  Estimated_completion_date: PythonDateString | null

  Additional_detail: string | null

  // Estimates
  Estimated_rent: number | null
  Estimated_material: number | null
  Estimated_city: number | null

  // Pricing (GQM / Tech)
  Tech_formula_pricing: number | null
  Gqm_formula_pricing: number | null
  Gqm_adj_formula_pricing: number | null
  Gqm_target_sold_pricing: number | null
  Gqm_target_return: number | null
  Gqm_premium_in_money: number | null
  Gqm_final_sold_pricing: number | null
  Gqm_final_percentage: number | null

  Pricing_target: string | null // (en tu JSON llega "Yes"/"No")
  Permit: string | null // (en tu JSON llega "Yes"/"No")

  Gqm_total_change_orders: number | null
  Gqm_total_materials_fees: number | null

  // Final pricing (extra fields del modelo)
  Acc_receivable: number | null
  Gqm_final_form_pricing: number | null
  Gqm_final_adj_form_pricing: number | null
  Gqm_final_target_return: number | null
  Gqm_final_prem_in_money: number | null

  // PTL-only-ish fields (pero existen en modelo)
  Ptl_Superintendent: string | null
  Ptl_property_id: string | null
  Ptl_gc_fee: string | null

  // Fees
  Gqm_paid_fees: number | null
  Bldg_dept_fees: number[] | null

  // Timestamps
  created_at: PythonDateString
  updated_at: PythonDateString

  // Relaciones (temporales/genéricas)
  client: ClientDetails | null
  attachments: Attachment[] | any[]
  tasks: Task[] | any[]
  estimate_costs: any[]
  tlactivity: any[]
  opportunities?: any[]
  change_orders: ChangeOrder[] | any[]
  financial_docs?: any[]
  purchases?: any[]
  multipliers: Multiplier[] | any[]
  members: MemberDetails[] | any[]
  subcontractors: Subcontractor[] | any[]
  payment_units: any[]
}

export interface JobsPaginatedResponse extends PaginatedResponse<JobDTO> {}

export type UpdateJobRequest = Partial<Pick<
  JobDTO,
  | "Job_status"
  | "Service_type"
  | "Project_name"
  | "Project_location"
  | "Po_wtn_wo"
  | "Date_assigned"
  | "Estimated_start_date"
  | "Estimated_project_duration"
  | "ID_Client"
  | "Gqm_formula_pricing"
  | "Gqm_adj_formula_pricing"
  | "Gqm_target_return"
  | "Gqm_final_sold_pricing"
  | "Gqm_target_sold_pricing"
  | "Gqm_premium_in_money"
  | "Gqm_final_percentage"
  | "Additional_detail"
  | "Permit"
  | "Pricing_target"
  | "Estimated_rent"
  | "Estimated_material"
  | "Estimated_city"
  | "Acc_receivable"
>>

export interface Job {
  id: string
  jobType: JobType
  projectName: string
  projectLocation: string
  status: JobStatus
  poWtnWo: string
  serviceType: string
  dateAssigned: string
  estimatedStartDate: string
  estimatedDuration: string
  client: Client
  representatives: GQMMember[]
  createdAt: string
  podioItemId?: string // Add podioItemId for PATCH requests
  multipliers?: Multiplier[] // Add multipliers array to Job
  estimate_costs?: any[] // Added estimate_costs array to store estimate costs from database
  pricingData?: {
    gqmFormulaPricing: number
    gqmAdjFormulaPricing: number
    gqmTargetReturn?: number // Add gqmTargetReturn field
    gqmTargetSoldPricing: number
    gqmPremiumInMoney: number
    gqmFinalSoldPricing: number
    gqmFinalPercentage: number
    gqmTotalChangeOrders: number
  }
}

export interface TimelineEvent {
  id: string
  activity: string
  date: string
  user: string
}

export interface DashboardMetric {
  name: string
  value: string
  change: number
}

export interface Multiplier {
  ID_MultiplierR: string
  Start_value: number
  End_value: number
  Multiplier: number
}

export interface Attachment {
  ID_Attachment: string
  Document_name: string
  Attachment_descr: string | null
  Link: string
  Document_type: string
  ID_Jobs: string
}

export interface Document {
  id: string
  publicId: string
  fileName: string
  fileSize: number
  uploadDate: string
  tag: string
  url: string
  secureUrl: string
  resourceType: string
  format: string
  thumbnailUrl?: string
}

export type SubcontractorStatus = "Active" | "Inactive" | "Archived" | "HOLD" | "PAID" | "Warranty" | "Cancelled" | "Completed" | "Invoiced" | "Assigned/P.Quote" | "Waiting for Approval" | "Schedule/Work in Progress" | null

export type ComplianceStatus = "Yes" | "No" | "N/A" | null

export type TechnicianType = "Leader" | "Worker" | string

export interface Technician {
  ID_Technician: string
  Name: string | null
  Email_Address: string | null
  Location: string | null
  Phone_Number: string | null
  Type_of_technician: TechnicianType | null
  ID_Subcontractor: string | null
  tasks?: any[]
  Password?: string
  Avatar?: string
}

export interface Subcontractor {
  ID_Subcontractor: string
  Organization: string | null
  Name: string | null
  Email_Address: string | null
  Phone_Number: string | null
  Organization_Website: string | null
  Address: string | null
  Status: SubcontractorStatus
  Score: number | null
  Gqm_compliance: ComplianceStatus
  Gqm_best_service_training: ComplianceStatus
  Specialty: string | null
  Coverage_Area: string[] | null
  Notes: string | null

  podio_item_id?: string | null

  technicians?: Technician[]
  orders?: any[]
  jobs?: any[]
  attachments?: any[]
  role?: any
  tlactivity?: any[]
  skills?: any[]
  opportunities?: any[]
}

export type TaskStatus = "Not started" | "Work-in-progress" | "Completed"

export interface Task {
  ID_Tasks: string
  Name: string
  Task_description: string
  Task_status: TaskStatus
  Priority: "Low" | "Medium" | "High"
  Designation_date: string
  Delivery_date: string
  ID_Jobs: string
  ID_Technician: string
  job_podio_id: string | null
  podio_item_id: string | null
  ID_Multiplier: string | null
}

export type CostType = "Subcontractor" | "Material" | "Labor" | "None" | ""
export type MarkupType = "C/P" | "%" | ""

export interface EstimateItem {
  ID_EstimateItem: string
  Category: string
  Cost_Code: string
  Title: string
  Parent_Group: string
  Parent_Group_Description: string
  Subgroup: string
  Subgroup_Description: string
  Option_Type: string
  Line_Item_Type: string
  Description: string
  Quantity: number
  Unit: string
  Unit_Cost: number
  Cost_Type: CostType
  Marked_As: string
  Builder_Cost: number
  Markup: number
  Markup_Type: MarkupType
  Unit_Price: number
  Client_Price: number
  Margin: number
  Profit: number
  Percent_Invoiced: number
  Internal_Notes: string
  ID_Jobs: string
  ID_Order?: string | null // Link to order if assigned
}

export interface SubcontractorOrder {
  ID_Order: string
  Order_Name: string
  ID_Subcontractor: string
  ID_Jobs: string
  Items: EstimateItem[]
  Total_Builder_Cost: number
  Total_Client_Price: number
  Total_Profit: number
  Created_Date: string
  Status: "Draft" | "Submitted" | "Approved" | "Completed"
}

export interface ChangeOrder {
  ID_ChangeOrder: string
  Title: string
  Description: string
  Cost: number
  Date_Created: string
  ID_Subcontractor: string
  ID_Jobs: string
  Status: "Pending" | "Approved" | "Rejected"
}

export interface UpdateClientRequest {
  Client_Community?: string
  Parent_Mgmt_Company?: string
  Parent_Company?: string
  Address?: string
  Website?: string
  Invoice_Collection?: string
  Compliance_Partner?: "Yes" | "No"
  Risk_Value?: RiskValue
  Prop_Manager?: string
  Email_Address?: string
  Phone_Number?: string
  Client_Status?: ClientStatus
  Services_interested_in?: ServicesInterestedIn
}

export type UserRole = "GQM_MEMBER" | "LEAD_TECHNICIAN"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string
}

//Permissions and Roles

export type PermissionActionType = "View" | "Create" | "Edit" | "Delete"

export type PermissionServiceType =
  | "Job"
  | "Subcontractor"
  | "GQM_Member"
  | "Technician"
  | "Client"
  | "Dashboard"

export interface Permission {
  ID_Permission: string
  Name: string | null
  Description: string | null
  Active: boolean | null
  Action: PermissionActionType
  Service_Associated: PermissionServiceType

  roles?: Role[]
  members?: any[]
  technicians?: any[]
}

export interface Role {
  ID_Role: string
  Name: string | null
  Description: string | null
  Active: boolean | null

  permissions?: Permission[]
  members?: any[]
  subcontractors?: any[]
}

export interface PaginatedResponse<T> {
  limit: number
  page: number
  total: number
  results: T[]
}
