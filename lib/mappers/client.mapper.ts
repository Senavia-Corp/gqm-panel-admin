import type { Client, ClientDetails } from "@/lib/types"

export function mapClientDetailsToClient(client: ClientDetails): Client {
  return {
    id: client.ID_Client,
    name: client.Prop_Manager ?? "",
    companyName: client.Parent_Company ?? "",
    email: client.Email_Address ?? "",
    phone: client.Phone_Number ?? "",
    address: client.Address ?? "",
    avatar: "/placeholder.svg?height=80&width=80",
    status: client.Client_Status ?? "",
    clientCommunity: client.Client_Community ?? undefined,
    parentMgmtCompany: client.Parent_Mgmt_Company ?? undefined,
    parentCompany: client.Parent_Company ?? undefined,
    website: client.Website ?? undefined,
    invoiceCollection: client.Invoice_Collection ?? undefined,
    compliancePartner: client.Compliance_Partner ?? undefined,
    riskValue: client.Risk_Value ?? undefined,
    propManager: client.Prop_Manager ?? undefined,
    clientStatus: client.Client_Status ?? undefined,
    servicesInterestedIn: client.Services_interested_in ?? undefined,
  }
}
