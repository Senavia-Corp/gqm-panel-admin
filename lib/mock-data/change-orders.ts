import type { ChangeOrder } from "@/lib/types"

export const mockChangeOrders: ChangeOrder[] = [
  {
    ID_ChangeOrder: "CO50001",
    Title: "Additional Drywall Repair",
    Description: "Unexpected water damage found during inspection requiring additional drywall replacement",
    Cost: 450.0,
    Date_Created: "2024-02-01",
    ID_Subcontractor: "SUBC50001",
    ID_Jobs: "PTL50001",
    Status: "Approved",
  },
  {
    ID_ChangeOrder: "CO50002",
    Title: "Extra Paint Material",
    Description: "Additional premium paint required for better coverage on textured walls",
    Cost: 125.0,
    Date_Created: "2024-02-05",
    ID_Subcontractor: "SUBC50001",
    ID_Jobs: "PTL50001",
    Status: "Approved",
  },
  {
    ID_ChangeOrder: "CO50003",
    Title: "Emergency HVAC Duct Repair",
    Description: "Damaged ductwork discovered during installation requiring immediate replacement",
    Cost: 320.0,
    Date_Created: "2024-02-10",
    ID_Subcontractor: "SUBC50002",
    ID_Jobs: "PTL50001",
    Status: "Pending",
  },
]
