"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Plus,
  X,
  Loader2,
  User,
  Building2,
  Briefcase,
  BadgeCheck,
  Mail,
  Phone,
  Globe,
  MapPin,
  Map,
  ShieldCheck,
  GraduationCap,
  ClipboardList,
  Link as LinkIcon,
} from "lucide-react"

type SubcontractorCreatePayload = {
  Organization?: string | null
  Name?: string | null
  Email_Address?: string | null
  Phone_Number?: string | null
  Organization_Website?: string | null
  Address?: string | null
  Status?: string | null
  Score?: number | null
  Gqm_compliance?: string | null
  Gqm_best_service_training?: string | null
  Specialty?: string | null
  Coverage_Area?: string[] | null
  Notes?: string | null
}

type FormState = {
  Name: string
  Organization: string
  Email_Address: string
  Phone_Number: string
  Organization_Website: string
  Address: string
  Status: "Active" | "Inactive"
  Score: number
  Gqm_compliance: "Active" | "Inactive"
  Gqm_best_service_training: "Active" | "Inactive"
  Specialty: string
  Notes: string
  Coverage_Area: string[]
}

type GqmOption = "Yes" | "No" | "N/A"

const COVERAGE_AREA_OPTIONS = [
  "Dade County",
  "Broward County",
  "Palm Beach County",
  "St. Lucie County",
  "Orange County",
  "Seminole County",
  "Pinellas County (St Pete)",
  "Hillsborough County (Tampa)",
  "Osceola County",
] as const

const clean = (s: string) => s.trim().replace(/\s+/g, " ")

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="block text-sm font-medium">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </Label>
      {children}
    </div>
  )
}

function IconInput({
  icon,
  input,
}: {
  icon: React.ReactNode
  input: React.ReactNode
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </div>
      {input}
    </div>
  )
}

export default function CreateSubcontractorPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  // Toggle Podio (default true)
  const [syncWithPodio, setSyncWithPodio] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state (NO nulls here -> fixes the TS "null is not assignable" errors)
  const [form, setForm] = useState<FormState>({
    Name: "",
    Organization: "",
    Email_Address: "",
    Phone_Number: "",
    Organization_Website: "",
    Address: "",
    Status: "Active",
    Score: 100,
    Gqm_compliance: "Active",
    Gqm_best_service_training: "Inactive",
    Specialty: "",
    Notes: "",
    Coverage_Area: [],
  })

  const [coveragePick, setCoveragePick] = useState<string>("")

  // Coverage area input
  const [coverageInput, setCoverageInput] = useState("")

  const canSubmit = useMemo(() => {
    const nameOk = clean(form.Name).length > 0
    const orgOk = clean(form.Organization).length > 0
    const emailOk = clean(form.Email_Address).length > 0
    return nameOk && orgOk && emailOk && !isSubmitting
  }, [form.Name, form.Organization, form.Email_Address, isSubmitting])

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

  const addCoverageArea = (valueRaw?: string) => {
    const value = clean(valueRaw ?? coveragePick)
    if (!value) return

    setForm((prev) => {
      const exists = prev.Coverage_Area.some((x) => x.toLowerCase() === value.toLowerCase())
      if (exists) return prev
      return { ...prev, Coverage_Area: [...prev.Coverage_Area, value] }
    })

    setCoveragePick("")
  }

  const removeCoverageArea = (value: string) => {
    setForm((prev) => ({
      ...prev,
      Coverage_Area: prev.Coverage_Area.filter((x) => x !== value),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    const payload: SubcontractorCreatePayload = {
      Name: clean(form.Name) || null,
      Organization: clean(form.Organization) || null,
      Email_Address: clean(form.Email_Address) || null,
      Phone_Number: clean(form.Phone_Number) || null,
      Organization_Website: clean(form.Organization_Website) || null,
      Address: form.Address.trim() || null,
      Status: form.Status || null,
      Score: typeof form.Score === "number" ? form.Score : null,
      Gqm_compliance: form.Gqm_compliance || null,
      Gqm_best_service_training: form.Gqm_best_service_training || null,
      Specialty: clean(form.Specialty) || null,
      Coverage_Area: form.Coverage_Area.length ? form.Coverage_Area : null,
      Notes: form.Notes.trim() || null,
    }

    try {
      setIsSubmitting(true)

      const res = await fetch(`/api/subcontractors?sync_podio=${syncWithPodio ? "true" : "false"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const detail = body?.detail || body?.error || body?.message || `Failed (${res.status})`
        throw new Error(detail)
      }

      router.push("/subcontractors")
    } catch (err: any) {
      console.error("Create subcontractor error:", err)
      alert(err?.message ?? "Failed to create subcontractor")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      {/* min-h-0 is key to prevent body scroll chaining / extra blank scroll */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TopBar user={user} />

        {/* overscroll-contain prevents scrolling beyond this container */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
          <Button variant="ghost" onClick={() => router.push("/subcontractors")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subcontractors
          </Button>

          <div className="mx-auto max-w-4xl pb-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl font-bold">Create New Subcontractor</h1>
                <p className="mt-2 text-sm text-gray-500">Fields marked with * are required.</p>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <LinkIcon className="h-4 w-4" />
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Sync with Podio</div>
                    <div className="text-xs text-gray-500">Create item in Podio on submit</div>
                  </div>
                </div>
                <Switch checked={syncWithPodio} onCheckedChange={setSyncWithPodio} disabled={isSubmitting} />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-gray-700" />
                  <h2 className="text-xl font-semibold">Basic Information</h2>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Name" htmlFor="Name" required>
                    <IconInput
                      icon={<User className="h-4 w-4" />}
                      input={
                        <Input
                          id="Name"
                          required
                          value={form.Name}
                          onChange={(e) => setForm({ ...form, Name: e.target.value })}
                          placeholder="John Doe"
                          className="pl-10"
                        />
                      }
                    />
                  </Field>

                  <Field label="Organization" htmlFor="Organization" required>
                    <IconInput
                      icon={<Building2 className="h-4 w-4" />}
                      input={
                        <Input
                          id="Organization"
                          required
                          value={form.Organization}
                          onChange={(e) => setForm({ ...form, Organization: e.target.value })}
                          placeholder="ABC Construction LLC"
                          className="pl-10"
                        />
                      }
                    />
                  </Field>

                  <Field label="Specialty" htmlFor="Specialty">
                    <IconInput
                      icon={<Briefcase className="h-4 w-4" />}
                      input={
                        <Input
                          id="Specialty"
                          value={form.Specialty}
                          onChange={(e) => setForm({ ...form, Specialty: e.target.value })}
                          placeholder="Electrical / Plumbing / HVAC..."
                          className="pl-10"
                        />
                      }
                    />
                  </Field>

                  <Field label="Status" htmlFor="Status">
                    <Select value={form.Status} onValueChange={(value: "Active" | "Inactive") => setForm({ ...form, Status: value })}>
                      <SelectTrigger id="Status" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Card>

              <Card className="p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-gray-700" />
                  <h2 className="text-xl font-semibold">Contact Information</h2>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Email" htmlFor="Email_Address" required>
                    <IconInput
                      icon={<Mail className="h-4 w-4" />}
                      input={
                        <Input
                          id="Email_Address"
                          type="email"
                          required
                          value={form.Email_Address}
                          onChange={(e) => setForm({ ...form, Email_Address: e.target.value })}
                          placeholder="john@example.com"
                          className="pl-10"
                        />
                      }
                    />
                  </Field>

                  <Field label="Phone Number" htmlFor="Phone_Number">
                    <IconInput
                      icon={<Phone className="h-4 w-4" />}
                      input={
                        <Input
                          id="Phone_Number"
                          value={form.Phone_Number}
                          onChange={(e) => setForm({ ...form, Phone_Number: e.target.value })}
                          placeholder="+1 234 567 8900"
                          className="pl-10"
                        />
                      }
                    />
                  </Field>

                  <Field label="Organization Website" htmlFor="Organization_Website">
                    <IconInput
                      icon={<Globe className="h-4 w-4" />}
                      input={
                        <Input
                          id="Organization_Website"
                          value={form.Organization_Website}
                          onChange={(e) => setForm({ ...form, Organization_Website: e.target.value })}
                          placeholder="www.example.com"
                          className="pl-10"
                        />
                      }
                    />
                  </Field>

                  <Field label="Address" htmlFor="Address">
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-3 text-gray-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <Textarea
                        id="Address"
                        value={form.Address}
                        onChange={(e) => setForm({ ...form, Address: e.target.value })}
                        placeholder="123 Main St, City, State, ZIP"
                        rows={3}
                        className="pl-10"
                      />
                    </div>
                  </Field>
                </div>
              </Card>

              <Card className="p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <Map className="h-5 w-5 text-gray-700" />
                  <h2 className="text-xl font-semibold">Coverage Area</h2>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <MapPin className="h-4 w-4" />
                      </div>

                      <Select
                        value={coveragePick || undefined}
                        onValueChange={(v) => {
                          setCoveragePick(v)
                          // auto-add to chips for speed
                          addCoverageArea(v)
                        }}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="h-10 pl-10">
                          <SelectValue placeholder="Select a county..." />
                        </SelectTrigger>
                        <SelectContent>
                          {COVERAGE_AREA_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt}
                              value={opt}
                              disabled={form.Coverage_Area.some((x) => x.toLowerCase() === opt.toLowerCase())}
                            >
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      onClick={() => addCoverageArea()}
                      className="gap-2"
                      disabled={isSubmitting || !coveragePick}
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>

                  {form.Coverage_Area.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {form.Coverage_Area.map((area) => (
                        <Badge key={area} variant="secondary" className="flex items-center gap-2 py-1">
                          {area}
                          <button
                            type="button"
                            onClick={() => removeCoverageArea(area)}
                            className="rounded p-0.5 hover:bg-black/10"
                            aria-label={`Remove ${area}`}
                            disabled={isSubmitting}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No coverage areas added yet.</p>
                  )}
                </div>
              </Card>

              <Card className="p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-gray-700" />
                  <h2 className="text-xl font-semibold">GQM Information</h2>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Score" htmlFor="Score">
                    <IconInput
                      icon={<ClipboardList className="h-4 w-4" />}
                      input={
                        <Input
                          id="Score"
                          type="number"
                          min={0}
                          max={300}
                          value={Number.isFinite(form.Score) ? form.Score : 0}
                          onChange={(e) => setForm({ ...form, Score: Number(e.target.value) })}
                          className="pl-10"
                          disabled={isSubmitting}
                        />
                      }
                    />
                  </Field>

                  <Field label="GQM Compliance" htmlFor="Gqm_compliance">
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <Select
                        value={form.Gqm_compliance}
                        onValueChange={(v: GqmOption) => setForm({ ...form, Gqm_compliance: v })}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="Gqm_compliance" className="h-10 pl-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </Field>

                  <Field label="GQM Best Service Training" htmlFor="Gqm_best_service_training">
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <Select
                        value={form.Gqm_best_service_training}
                        onValueChange={(v: GqmOption) => setForm({ ...form, Gqm_best_service_training: v })}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="Gqm_best_service_training" className="h-10 pl-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </Field>
                </div>
              </Card>

              <Card className="p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-gray-700" />
                  <h2 className="text-xl font-semibold">Notes</h2>
                </div>

                <Textarea
                  value={form.Notes}
                  onChange={(e) => setForm({ ...form, Notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={4}
                  disabled={isSubmitting}
                />
              </Card>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.push("/subcontractors")} disabled={isSubmitting}>
                  Cancel
                </Button>

                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Subcontractor"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}