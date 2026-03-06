"use client"

// ✅ FIX 1: import { use } de react — API correcta para unwrap Promise params en Client Components
import React, { use, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { TimelineItem } from "@/components/molecules/TimelineItem"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { mockTimelineEvents } from "@/lib/mock-data/timeline"
import { Save, ArrowLeft, RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { CommunityDetailsCard, type CommunityClient } from "@/components/organisms/CommunityDetailsCard"
import { CommunityDetailsModal } from "@/components/organisms/CommunityDetailsModal"

type ClientCommunity = CommunityClient

type ParentMgmtCo = {
  ID_Community_Tracking: string
  Property_mgmt_co?: string | null
  Company_abbrev?: string | null
  Main_office_hq?: string | null
  Main_office_email?: string | null
  Main_office_number?: string | null
  State?: string | null
  podio_item_id?: string | null
  clients?: ClientCommunity[]
  managers?: any[]
}

// ✅ FIX 1: params es Promise en Next.js 15 page components
type ParentMgmtCoDetailsPageProps = {
  params: Promise<{ id: string }>
}

// ✅ FIX 2: campos relacionales que NO se envían en PATCH (no son columnas del modelo Python)
const SKIP_ON_PATCH: Array<keyof ParentMgmtCo> = ["clients", "managers", "ID_Community_Tracking"]

export default function ParentMgmtCoDetailsPage({ params }: ParentMgmtCoDetailsPageProps) {
  const router = useRouter()

  // ✅ FIX 1: use() en lugar de (React as any).use() — sin hack de cast
  const { id: parentMgmtCoId } = use(params)

  const [user, setUser] = useState<any>(null)
  const [parentMgmtCo, setParentMgmtCo] = useState<ParentMgmtCo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState<Partial<ParentMgmtCo>>({})

  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false)
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null)

  const handleOpenCommunityDetails = (clientId: string) => {
    setSelectedCommunityId(clientId)
    setIsCommunityModalOpen(true)
  }

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) { router.push("/login"); return }
    setUser(JSON.parse(userData))
  }, [router])

  const fetchParentMgmtCoData = async () => {
    if (!parentMgmtCoId) return
    try {
      setLoading(true)
      setLoadError(null)

      const response = await fetch(`/api/parent_mgmt_co/${parentMgmtCoId}`, { cache: "no-store" })
      if (!response.ok) {
        const errText = await response.text().catch(() => "")
        throw new Error(`Failed to fetch parent mgmt co (${response.status})${errText ? `: ${errText}` : ""}`)
      }

      const data = (await response.json()) as ParentMgmtCo
      const normalized: ParentMgmtCo = {
        ...data,
        ID_Community_Tracking: data.ID_Community_Tracking ?? parentMgmtCoId,
        clients: Array.isArray(data.clients) ? data.clients : [],
        managers: Array.isArray(data.managers) ? data.managers : [],
      }

      setParentMgmtCo(normalized)
      setFormData(normalized)
    } catch (error: any) {
      console.error("Error fetching parent mgmt co:", error)
      setParentMgmtCo(null)
      setLoadError(error?.message ?? "Failed to load parent mgmt co data")
      toast({ title: "Error", description: "Failed to load parent management company data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParentMgmtCoData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentMgmtCoId])

  const handleFieldChange = (field: keyof ParentMgmtCo, value: any) => {
    setEditedFields((prev) => new Set([...prev, field as string]))
    setFormData((prev) => ({ ...prev, [field]: value }))
    setIsEditing(true)
  }

  const handleSaveChanges = async () => {
    if (!parentMgmtCoId) return

    // ✅ FIX 2: strip campos relacionales — PaMgmtCoUpdate solo acepta PaMgmtCoBase fields.
    // Enviar clients[] o managers[] hace que Pydantic lance ValidationError en el backend.
    const patchPayload: Record<string, any> = {}
    for (const [key, value] of Object.entries(formData)) {
      if (!SKIP_ON_PATCH.includes(key as keyof ParentMgmtCo)) {
        patchPayload[key] = value
      }
    }

    try {
      const response = await fetch(`/api/parent_mgmt_co/${parentMgmtCoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchPayload),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => "")
        throw new Error(`Failed to update (${response.status})${errText ? `: ${errText}` : ""}`)
      }

      const updated = (await response.json()) as ParentMgmtCo

      // ✅ FIX 3: el PATCH response de Python es obj.model_dump() — no incluye Relationships.
      // Si sobreescribimos con updated directamente, clients queda undefined → contador en 0.
      // Preservamos clients/managers del estado anterior.
      const normalized: ParentMgmtCo = {
        ...updated,
        clients: parentMgmtCo?.clients ?? [],
        managers: parentMgmtCo?.managers ?? [],
      }

      setParentMgmtCo(normalized)
      setFormData(normalized)
      setIsEditing(false)
      setEditedFields(new Set())

      toast({ title: "Success", description: "Parent management company updated successfully" })
    } catch (error: any) {
      console.error("Error updating parent mgmt co:", error)
      toast({
        title: "Error",
        description: error?.message ?? "Failed to update parent management company",
        variant: "destructive",
      })
    }
  }

  const clients = useMemo(() => parentMgmtCo?.clients ?? [], [parentMgmtCo?.clients])
  const associatedClientsCount = clients.length

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]" />
                <p className="mt-4 text-muted-foreground">Loading parent management company...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!parentMgmtCo) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-xl">
              <Card className="p-6">
                <h1 className="text-xl font-semibold">Parent Management Company could not be loaded</h1>
                <p className="mt-2 text-sm text-muted-foreground">{loadError ?? "Unknown error."}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => router.push("/clients")} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to List
                  </Button>
                  <Button onClick={fetchParentMgmtCoData} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Retry
                  </Button>
                </div>
                {parentMgmtCoId && <p className="mt-4 text-xs text-muted-foreground">ID: {parentMgmtCoId}</p>}
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Parent Management Company Detail</h1>
              <p className="text-lg text-muted-foreground">ID: {parentMgmtCo.ID_Community_Tracking}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.push("/clients")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {isEditing && editedFields.size > 0 && (
                <Button onClick={handleSaveChanges} className="bg-gqm-green hover:bg-gqm-green/90 gap-2">
                  <Save className="h-4 w-4" /> Save Changes
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              <Card className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Company Information</h2>
                  <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-semibold text-white">
                    {associatedClientsCount} communities
                  </span>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label className="mb-2 block font-semibold">Parent Management Company</Label>
                    <Input
                      value={formData.Property_mgmt_co ?? ""}
                      onChange={(e) => handleFieldChange("Property_mgmt_co", e.target.value)}
                      className={editedFields.has("Property_mgmt_co") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">Company Abbrev</Label>
                    <Input
                      value={formData.Company_abbrev ?? ""}
                      onChange={(e) => handleFieldChange("Company_abbrev", e.target.value)}
                      className={editedFields.has("Company_abbrev") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">State</Label>
                    <Input
                      value={formData.State ?? ""}
                      onChange={(e) => handleFieldChange("State", e.target.value)}
                      className={editedFields.has("State") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-2 block font-semibold">Main Office HQ</Label>
                    <Textarea
                      value={formData.Main_office_hq ?? ""}
                      onChange={(e) => handleFieldChange("Main_office_hq", e.target.value)}
                      className={editedFields.has("Main_office_hq") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">Main Office Email</Label>
                    <Input
                      type="email"
                      value={formData.Main_office_email ?? ""}
                      onChange={(e) => handleFieldChange("Main_office_email", e.target.value)}
                      className={editedFields.has("Main_office_email") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">Main Office Number</Label>
                    <Input
                      value={formData.Main_office_number ?? ""}
                      onChange={(e) => handleFieldChange("Main_office_number", e.target.value)}
                      className={editedFields.has("Main_office_number") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-2 block font-semibold">Podio Item ID</Label>
                    <Input
                      value={formData.podio_item_id ?? ""}
                      onChange={(e) => handleFieldChange("podio_item_id", e.target.value)}
                      className={editedFields.has("podio_item_id") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                    />
                  </div>
                </div>
              </Card>

              {/* Associated Communities */}
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Associated Communities</h2>
                  <span className="text-sm text-muted-foreground">{associatedClientsCount} total</span>
                </div>
                {associatedClientsCount === 0 ? (
                  <p className="text-sm text-muted-foreground">No communities associated to this parent management company.</p>
                ) : (
                  <div className="space-y-3">
                    {clients.map((c) => (
                      <CommunityDetailsCard key={c.ID_Client} client={c} onViewDetails={handleOpenCommunityDetails} />
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Timeline</h2>
                <div className="space-y-3">
                  {mockTimelineEvents.map((event) => (
                    <TimelineItem key={event.id} activity={event.activity} date={new Date(event.date).toLocaleDateString()} />
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <CommunityDetailsModal
            open={isCommunityModalOpen}
            onOpenChange={setIsCommunityModalOpen}
            clientId={selectedCommunityId}
          />
        </main>
      </div>
    </div>
  )
}