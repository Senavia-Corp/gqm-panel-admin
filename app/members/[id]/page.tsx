"use client"

import { useState, useEffect } from "react"
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
import { Save, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import type { MemberDetails } from "@/lib/types"

export default function MemberDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<MemberDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState<Partial<MemberDetails>>({})

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  })

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
    fetchMemberData()
  }, [params.id, router])

  const fetchMemberData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/members/${params.id}`)

      if (!response.ok) {
        throw new Error("Failed to fetch member")
      }

      const data = await response.json()
      setMember(data)
      setFormData(data)
    } catch (error) {
      console.error("Error fetching member:", error)
      toast.error("Failed to load member data")
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (field: keyof MemberDetails, value: any) => {
    setEditedFields(new Set(editedFields.add(field)))
    setFormData({ ...formData, [field]: value })
    setIsEditing(true)
  }

  const validatePassword = (password: string): boolean => {
    const hasMinLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    return hasMinLength && hasUpperCase && hasNumber
  }

  const handlePasswordChange = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error("Please fill in all password fields")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (!validatePassword(passwordData.newPassword)) {
      toast.error("Password must be at least 8 characters with one uppercase letter and one number")
      return
    }

    try {
      const response = await fetch(`/api/members/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Password: passwordData.newPassword,
          // In a real scenario, you'd verify oldPassword on the backend
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update password")
      }

      toast.success("Password updated successfully")
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" })
      setShowPasswordSection(false)
    } catch (error) {
      console.error("Error updating password:", error)
      toast.error("Failed to update password")
    }
  }

  const handleSaveChanges = async () => {
    try {
      const changedData: Record<string, any> = {}
      editedFields.forEach((field) => {
        if (field in formData) {
          changedData[field] = formData[field as keyof MemberDetails]
        }
      })

      console.log("[v0] Saving only changed fields:", changedData)

      const response = await fetch(`/api/members/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changedData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Error updating member:", errorData)
        throw new Error("Failed to update member")
      }

      const updatedMember = await response.json()
      setMember(updatedMember)
      setFormData(updatedMember)
      setIsEditing(false)
      setEditedFields(new Set())

      toast.success("Member updated successfully")
    } catch (error) {
      console.error("Error updating member:", error)
      toast.error("Failed to update member")
    }
  }

  if (loading || !member) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                <p className="mt-4 text-muted-foreground">Loading member data...</p>
              </div>
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
              <h1 className="text-3xl font-bold">Member Detail</h1>
              <p className="text-lg text-muted-foreground">Member ID: {member.ID_Member}</p>
            </div>

            {isEditing && editedFields.size > 0 && (
              <Button onClick={handleSaveChanges} className="bg-gqm-green hover:bg-gqm-green/90">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              {/* Member Information */}
              <Card className="p-6">
                <h2 className="mb-6 text-xl font-semibold">Member Information</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label className="mb-2 block font-semibold">Acc Rep</Label>
                    <Input
                      value={formData.Acc_Rep || ""}
                      onChange={(e) => handleFieldChange("Acc_Rep", e.target.value)}
                      className={editedFields.has("Acc_Rep") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">Email</Label>
                    <Input
                      type="email"
                      value={formData.Email_Address || ""}
                      onChange={(e) => handleFieldChange("Email_Address", e.target.value)}
                      className={editedFields.has("Email_Address") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">Phone Number</Label>
                    <Input
                      value={formData.Phone_Number || ""}
                      onChange={(e) => handleFieldChange("Phone_Number", e.target.value)}
                      className={editedFields.has("Phone_Number") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-2 block font-semibold">Address</Label>
                    <Textarea
                      value={formData.Address || ""}
                      onChange={(e) => handleFieldChange("Address", e.target.value)}
                      className={editedFields.has("Address") ? "border-yellow-500 ring-2 ring-yellow-200" : ""}
                      rows={2}
                    />
                  </div>
                </div>
              </Card>

              {/* Password Management */}
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Password Management</h2>
                  <Button variant="outline" onClick={() => setShowPasswordSection(!showPasswordSection)}>
                    {showPasswordSection ? "Cancel" : "Change Password"}
                  </Button>
                </div>

                {showPasswordSection && (
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block font-semibold">Old Password</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.old ? "text" : "password"}
                          value={passwordData.oldPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                          placeholder="Enter old password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                        >
                          {showPasswords.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block font-semibold">New Password</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          placeholder="Enter new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Must be at least 8 characters with one uppercase letter and one number
                      </p>
                    </div>

                    <div>
                      <Label className="mb-2 block font-semibold">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          placeholder="Confirm new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button onClick={handlePasswordChange} className="w-full">
                      Update Password
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Timeline */}
              <Card className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Timeline</h2>
                <div className="space-y-3">
                  {mockTimelineEvents.map((event) => (
                    <TimelineItem
                      key={event.id}
                      activity={event.activity}
                      date={new Date(event.date).toLocaleDateString()}
                    />
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
