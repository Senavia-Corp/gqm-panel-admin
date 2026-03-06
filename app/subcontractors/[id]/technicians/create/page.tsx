"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import type { TechnicianType } from "@/lib/types"

export default function CreateTechnicianPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    location: "",
    phoneNumber: "",
    type: "Worker" as TechnicianType,
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors: string[] = []

    // Validate required fields
    if (!formData.name) validationErrors.push("Name is required")
    if (!formData.email) validationErrors.push("Email is required")
    if (!formData.location) validationErrors.push("Location is required")
    if (!formData.phoneNumber) validationErrors.push("Phone number is required")
    if (!formData.password) validationErrors.push("Password is required")

    // Validate password
    const passwordErrors = validatePassword(formData.password)
    validationErrors.push(...passwordErrors)

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      validationErrors.push("Passwords do not match")
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    console.log("Creating technician:", formData)
    router.push(`/subcontractors/${params.id}?tab=technicians`)
  }

  if (!user) return null

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

          <div className="mx-auto max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold">Create New Technician</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="p-6">
                <h2 className="mb-6 text-xl font-semibold">Personal Information</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label className="mb-2 block font-semibold">Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">Technician Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: TechnicianType) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Leader">Leader</SelectItem>
                        <SelectItem value="Worker">Worker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-2 block font-semibold">Location *</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, State"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="mb-6 text-xl font-semibold">Contact Information</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label className="mb-2 block font-semibold">Email (Username) *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">Phone Number *</Label>
                    <Input
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="+1-XXX-XXX-XXXX"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="mb-6 text-xl font-semibold">Authentication</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label className="mb-2 block font-semibold">Password *</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Must be at least 8 characters with 1 number and 1 capital letter
                    </p>
                  </div>
                  <div>
                    <Label className="mb-2 block font-semibold">Confirm Password *</Label>
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </Card>

              {errors.length > 0 && (
                <div className="rounded-md bg-red-50 p-4">
                  <h3 className="mb-2 font-semibold text-red-800">Please fix the following errors:</h3>
                  <ul className="list-inside list-disc text-sm text-red-600">
                    {errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Create Technician
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => router.push(`/subcontractors/${params.id}?tab=technicians`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
