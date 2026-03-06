import type { EstimateItem, JobDTO } from "@/lib/types"

export function mapEstimateCostsFromJob(job: JobDTO): { items: EstimateItem[]; hasSaved: boolean } {
  const costs = job.estimate_costs ?? []
  if (!Array.isArray(costs) || costs.length === 0) {
    return { items: [], hasSaved: false }
  }

  const items: EstimateItem[] = costs.map((cost: any) => ({
    ID_EstimateItem: cost.ID_EstimateCost,
    ID_Jobs: cost.ID_Jobs,

    Category: cost.Category || "",
    Cost_Code: cost.Cost_code || "",
    Title: cost.Title || "",
    Parent_Group: cost.Parent_group || "",
    Parent_Group_Description: "",

    Subgroup: "",
    Subgroup_Description: "",
    Option_Type: "",
    Line_Item_Type: "",

    Description: cost.Description || "",
    Quantity: cost.Quatity || 0, // ojo: backend viene con typo "Quatity"
    Unit: cost.Unit || "",
    Unit_Cost: cost.Unit_cost || 0,

    Cost_Type: cost.Cost_type || "Subcontractor",

    Marked_As: "",
    Builder_Cost: cost.Builder_cost || 0,
    Markup: cost.Markup || 0,
    Markup_Type: "",

    Unit_Price: 0,
    Client_Price: cost.Client_price || 0,

    Margin: cost.Margin || 0,
    Profit: (cost.Client_price || 0) - (cost.Builder_cost || 0),
    Percent_Invoiced: cost.Percent_invoiced || 0,

    Internal_Notes: "",
    ID_Order: cost.ID_Order || null,
  }))

  return { items, hasSaved: true }
}

export function mapEstimateItemToCreatePayload(item: EstimateItem, jobId: string) {
  return {
    Title: item.Title,
    Cost_code: item.Cost_Code,
    Category: item.Category,
    Parent_group: item.Parent_Group,
    Description: item.Description,

    // ✅ IMPORTANTE: backend espera "Quatity" (typo)
    Quatity: item.Quantity,

    Unit: item.Unit,
    Unit_cost: item.Unit_Cost,
    Cost_type: item.Cost_Type,
    Builder_cost: item.Builder_Cost,
    Client_price: item.Client_Price,
    Markup: item.Markup,
    Margin: item.Margin,
    Percent_invoiced: item.Percent_Invoiced,
    Status: "",
    ID_Jobs: jobId,
  }
}
