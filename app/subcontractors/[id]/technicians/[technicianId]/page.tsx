"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockTechnicians } from "@/lib/mock-data/technicians"
import { mockSubcontractors } from "@/lib/mock-data/subcontractors"
import { mockTimelineEvents } from "@/lib/mock-data/timeline"
import { TimelineItem } from "@/components/molecules/TimelineItem"
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Technician } from "@/lib/types"
import { TechnicianJobsSection } from "@/components/organisms/TechnicianJobsSection"

export default function TechnicianDetailsPage({ params }: { params: { id: string; technicianId: string } }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [technician, setTechnician] = useState<Technician | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState<Partial<Technician>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))

    const found = mockTechnicians.find((tech) => tech.ID_Technician === params.technicianId)
    if (found) {
      setTechnician(found)
      setFormData(found)
    }
  }, [params.technicianId, router])

  const handleFieldChange = (field: keyof Technician, value: any) => {
    setEditedFields(new Set(editedFields.add(field)))
    setFormData({ ...formData, [field]: value })
    setIsEditing(true)
  }

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long")
    }
    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number")
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one capital letter")
    }
    return errors
  }

  const handlePasswordChange = () => {
    const errors: string[] = []

    if (passwordForm.oldPassword !== technician?.Password) {
      errors.push("Current password is incorrect")
    }

    const validationErrors = validatePassword(passwordForm.newPassword)
    errors.push(...validationErrors)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.push("New passwords do not match")
    }

    if (errors.length > 0) {
      setPasswordErrors(errors)
      return
    }

    handleFieldChange("Password", passwordForm.newPassword)
    setPasswordErrors([])
    setIsChangingPassword(false)
    setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" })
  }

  const handleSaveChanges = () => {
    console.log("Saving technician changes:", formData)
    if (technician) {
      setTechnician({ ...technician, ...formData })
    }
    setIsEditing(false)
    setEditedFields(new Set())
  }

  const subcontractor = mockSubcontractors.find((sub) => sub.ID_Subcontractor === params.id)
  const leaderTechnician = subcontractor?.technicians?.find((tech: Technician) => tech.Type === "Leader")

  if (!user || !technician) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/subcontractors/${params.id}?tab=technicians`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Technicians
          </Button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={technician.Avatar || "/placeholder.svg"} alt={technician.Name} />
                    <AvatarFallback className="bg-gqm-yellow text-gqm-green-dark text-2xl font-semibold">
                      {technician.Name.split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-3xl font-bold">{technician.Name}</h1>
                    <p className="text-muted-foreground">{technician.ID_Technician}</p>
                  </div>
                </div>
                {isEditing && (
                  <Button onClick={handleSaveChanges} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="mb-6 text-xl font-semibold">Personal Information</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label className="mb-2 block font-semibold">Name</Label>
                      <Input
                        value={formData.Name || ""}
                        onChange={(e) => handleFieldChange("Name", e.target.value)}
                        className={editedFields.has("Name") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block font-semibold">Technician Type</Label>
                      <Select value={formData.Type} onValueChange={(value) => handleFieldChange("Type", value)}>
                        <SelectTrigger
                          className={editedFields.has("Type") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Leader">Leader</SelectItem>
                          <SelectItem value="Worker">Worker</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="mb-2 block font-semibold">Location</Label>
                      <Input
                        value={formData.Location || ""}
                        onChange={(e) => handleFieldChange("Location", e.target.value)}
                        className={editedFields.has("Location") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="mb-6 text-xl font-semibold">Contact Information</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label className="mb-2 block font-semibold">Email (Username)</Label>
                      <Input
                        type="email"
                        value={formData.Email || ""}
                        onChange={(e) => handleFieldChange("Email", e.target.value)}
                        className={editedFields.has("Email") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block font-semibold">Phone Number</Label>
                      <Input
                        value={formData.Phone_number || ""}
                        onChange={(e) => handleFieldChange("Phone_number", e.target.value)}
                        className={editedFields.has("Phone_number") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="mb-6 text-xl font-semibold">Authentication</h2>
                  {!isChangingPassword ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="mb-2 block font-semibold">Password</Label>
                        <div className="flex gap-2">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={formData.Password || ""}
                            readOnly
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button onClick={() => setIsChangingPassword(true)} variant="outline">
                        Change Password
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="mb-2 block font-semibold">Current Password</Label>
                        <Input
                          type="password"
                          value={passwordForm.oldPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block font-semibold">New Password</Label>
                        <Input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Must be at least 8 characters with 1 number and 1 capital letter
                        </p>
                      </div>
                      <div>
                        <Label className="mb-2 block font-semibold">Confirm New Password</Label>
                        <Input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        />
                      </div>
                      {passwordErrors.length > 0 && (
                        <div className="rounded-md bg-red-50 p-3">
                          <ul className="list-inside list-disc text-sm text-red-600">
                            {passwordErrors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button onClick={handlePasswordChange}>Save Password</Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsChangingPassword(false)
                            setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" })
                            setPasswordErrors([])
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>

                <TechnicianJobsSection technician={technician} />
              </div>
            </div>

            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Leader Information</h2>
                {leaderTechnician ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-gqm-yellow text-gqm-green-dark text-lg font-semibold">
                          {leaderTechnician.Name.split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{leaderTechnician.Name}</h3>
                        <p className="text-sm text-muted-foreground">{leaderTechnician.ID_Technician}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Organization:</span> {subcontractor?.Organization}
                      </p>
                      <p>
                        <span className="font-medium">Phone:</span> {leaderTechnician.Phone_number}
                      </p>
                      <p>
                        <span className="font-medium">Location:</span> {leaderTechnician.Location}
                      </p>
                      <p>
                        <span className="font-medium">Email:</span> {leaderTechnician.Email}
                      </p>
                      <p>
                        <span className="font-medium">Tech ID:</span> {leaderTechnician.ID_Technician}
                      </p>
                      <p>
                        <span className="font-medium">Type:</span>{" "}
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                          {leaderTechnician.Type}
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No leader assigned</p>
                )}
              </Card>

              <Card className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Timeline</h2>
                <div className="space-y-3">
                  {mockTimelineEvents.slice(0, 5).map((event) => (
                    <TimelineItem key={event.id} activity={event.title} date={event.date} />
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
