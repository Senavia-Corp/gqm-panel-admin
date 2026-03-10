"use client"

// ✅ FIX 1: import { use } de react — API correcta para unwrap Promise params en Client Components
import React, { use, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Save, ArrowLeft, RefreshCw, Search, Users, Mail, Phone, Plus, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { CommunityDetailsCard, type CommunityClient } from "@/components/organisms/CommunityDetailsCard"

// ─── Array field helpers ─────────────────────────────────────────────────────

/**
 * Parse a Postgres array literal like {"a","b"} or a plain string.
 * Returns an array of trimmed, non-empty strings.
 */
function parseArrayField(raw: string | null | undefined): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1)
    const items: string[] = []
    let current = ""
    let inQuote = false
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i]
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === "," && !inQuote) { items.push(current.trim()); current = ""; continue }
      current += ch
    }
    if (current.trim()) items.push(current.trim())
    return items.filter(Boolean)
  }
  return trimmed ? [trimmed] : []
}

/**
 * Serialize a string[] back to Postgres array literal: {"a","b"}
 * Used when sending PATCH payload to the backend.
 */
export function serializeArrayField(values: string[]): string {
  if (values.length === 0) return ""
  if (values.length === 1) return values[0]
  return '{' + values.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",") + '}'
}

// ─── Read-only display: chips with icon ──────────────────────────────────────
function ArrayDisplayField({
  raw, icon: Icon, linkPrefix, emptyLabel, changed,
}: {
  raw: string | null | undefined
  icon: React.ElementType
  linkPrefix?: string
  emptyLabel: string
  changed?: boolean
}) {
  const values = parseArrayField(raw)
  return (
    <div className={`min-h-[40px] rounded-lg border px-3 py-2 ${changed ? "border-yellow-500 ring-2 ring-yellow-200" : "border-slate-200 bg-slate-50"}`}>
      {values.length === 0 ? (
        <span className="flex items-center gap-1.5 text-xs text-slate-400 italic">
          <Icon className="h-3.5 w-3.5" /> {emptyLabel}
        </span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            linkPrefix ? (
              <a key={i} href={`${linkPrefix}${v}`}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                title={v}>
                <Icon className="h-2.5 w-2.5 flex-shrink-0 text-slate-400" />
                <span className="max-w-[200px] truncate">{v}</span>
              </a>
            ) : (
              <span key={i} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
                <Icon className="h-2.5 w-2.5 flex-shrink-0 text-slate-400" />
                <span className="max-w-[200px] truncate">{v}</span>
              </span>
            )
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Edit mode: one input per item + add/remove ───────────────────────────────
// Ready for when edit is implemented.
// onChange receives the new serialized string (Postgres array literal or plain string).
function ArrayEditField({
  raw, icon: Icon, placeholder, onChange, changed,
}: {
  raw: string | null | undefined
  icon: React.ElementType
  placeholder: string
  onChange: (serialized: string) => void
  changed?: boolean
}) {
  const [items, setItems] = React.useState<string[]>(() => {
    const parsed = parseArrayField(raw)
    return parsed.length > 0 ? parsed : [""]
  })

  // Sync from outside (e.g. on reload) — only on raw prop change
  React.useEffect(() => {
    const parsed = parseArrayField(raw)
    setItems(parsed.length > 0 ? parsed : [""])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = (newItems: string[]) => {
    setItems(newItems)
    const nonEmpty = newItems.filter((v) => v.trim())
    onChange(serializeArrayField(nonEmpty))
  }

  const handleChange = (idx: number, val: string) => {
    const next = [...items]
    next[idx] = val
    update(next)
  }

  const handleAdd = () => update([...items, ""])

  const handleRemove = (idx: number) => {
    if (items.length === 1) { update([""]); return }
    update(items.filter((_, i) => i !== idx))
  }

  return (
    <div className={`rounded-lg border p-2 space-y-1.5 ${changed ? "border-yellow-500 ring-2 ring-yellow-200" : "border-slate-200"}`}>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <input
            type="text"
            value={item}
            onChange={(e) => handleChange(idx, e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
          />
          <button
            type="button"
            onClick={() => handleRemove(idx)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 transition-colors"
      >
        <Plus className="h-3 w-3" /> Add another
      </button>
    </div>
  )
}


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

  const [communitySearch, setCommunitySearch] = useState("")

  const handleOpenCommunityDetails = (clientId: string) => {
    router.push(`/communities/${clientId}`)
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

  const allClients = useMemo(() => parentMgmtCo?.clients ?? [], [parentMgmtCo?.clients])
  const associatedClientsCount = allClients.length

  const clients = useMemo(() => {
    const q = communitySearch.trim().toLowerCase()
    if (!q) return allClients
    return allClients.filter((c) => {
      const haystack = [
        c.Client_Community, c.ID_Client, c.Address,
        c.Compliance_Partner, c.ID_Community_Tracking,
      ].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(q)
    })
  }, [allClients, communitySearch])

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
              {!isEditing ? (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="gap-2 border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                >
                  ✎ Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => { setIsEditing(false); setEditedFields(new Set()); setFormData(parentMgmtCo ?? {}) }}
                    className="gap-2 border-slate-200 text-slate-500"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                  {editedFields.size > 0 && (
                    <Button onClick={handleSaveChanges} className="bg-gqm-green hover:bg-gqm-green/90 gap-2">
                      <Save className="h-4 w-4" /> Save Changes
                    </Button>
                  )}
                </>
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
                    {isEditing ? (
                      <ArrayEditField
                        raw={formData.Main_office_email}
                        icon={Mail}
                        placeholder="email@example.com"
                        changed={editedFields.has("Main_office_email")}
                        onChange={(val) => handleFieldChange("Main_office_email", val)}
                      />
                    ) : (
                      <ArrayDisplayField
                        raw={parentMgmtCo.Main_office_email}
                        icon={Mail}
                        linkPrefix="mailto:"
                        emptyLabel="No email set"
                        changed={editedFields.has("Main_office_email")}
                      />
                    )}
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">Main Office Number</Label>
                    {isEditing ? (
                      <ArrayEditField
                        raw={formData.Main_office_number}
                        icon={Phone}
                        placeholder="(555) 000-0000"
                        changed={editedFields.has("Main_office_number")}
                        onChange={(val) => handleFieldChange("Main_office_number", val)}
                      />
                    ) : (
                      <ArrayDisplayField
                        raw={parentMgmtCo.Main_office_number}
                        icon={Phone}
                        linkPrefix="tel:"
                        emptyLabel="No phone set"
                        changed={editedFields.has("Main_office_number")}
                      />
                    )}
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
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                      <Users className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-semibold">Associated Communities</h2>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                      {associatedClientsCount}
                    </span>
                  </div>
                  {clients.length !== associatedClientsCount && (
                    <span className="text-xs text-slate-400">{clients.length} shown</span>
                  )}
                </div>

                {/* Search bar — only shown when there are communities */}
                {associatedClientsCount > 0 && (
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search communities by name, ID, address…"
                      value={communitySearch}
                      onChange={(e) => setCommunitySearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                    />
                    {communitySearch && (
                      <button
                        onClick={() => setCommunitySearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}

                {associatedClientsCount === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                    <Users className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No communities yet</p>
                    <p className="text-xs text-slate-400">Communities will appear here once associated.</p>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                    <Search className="h-6 w-6 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No results for "{communitySearch}"</p>
                    <button onClick={() => setCommunitySearch("")} className="text-xs text-emerald-600 hover:underline">
                      Clear search
                    </button>
                  </div>
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
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                  <span className="text-2xl">🕐</span>
                  <p className="text-sm font-medium text-slate-600">Timeline coming soon</p>
                  <p className="text-xs text-slate-400">Activity history for parent management companies will be available in a future update.</p>
                </div>
              </Card>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}