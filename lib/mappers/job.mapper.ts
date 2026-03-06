import type { Job, JobDTO } from "@/lib/types"
import { mapClientDetailsToClient } from "./client.mapper"

export function mapJobDtoToJob(dto: JobDTO): Job {
  return {
    id: dto.ID_Jobs ?? "",
    jobType: dto.Job_type,
    projectName: dto.Project_name ?? "",
    projectLocation: dto.Project_location ?? "",
    status: (dto.Job_status ?? "") as any,
    poWtnWo: dto.Po_wtn_wo ?? "",
    serviceType: dto.Service_type ?? "",
    dateAssigned: dto.Date_assigned ?? "",
    estimatedStartDate: dto.Estimated_start_date ?? "",
    estimatedDuration: dto.Estimated_project_duration ?? "",
    client: dto.client ? mapClientDetailsToClient(dto.client) : (null as any),
    representatives: [],
    createdAt: dto.created_at,
    podioItemId: dto.podio_item_id ?? undefined,
    multipliers: (dto.multipliers ?? []) as any,
    estimate_costs: dto.estimate_costs ?? [],
    pricingData: {
      gqmFormulaPricing: dto.Gqm_formula_pricing ?? 0,
      gqmAdjFormulaPricing: dto.Gqm_adj_formula_pricing ?? 0,
      gqmTargetReturn: dto.Gqm_target_return ?? 0.31,
      gqmTargetSoldPricing: dto.Gqm_target_sold_pricing ?? 0,
      gqmPremiumInMoney: dto.Gqm_premium_in_money ?? 0,
      gqmFinalSoldPricing: dto.Gqm_final_sold_pricing ?? 0,
      gqmFinalPercentage: dto.Gqm_final_percentage ?? 0,
      gqmTotalChangeOrders: dto.Gqm_total_change_orders ?? 0,
    },
  }
}
