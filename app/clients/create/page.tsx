"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export default function CreateClientPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    clientCommunity: "",
    parentMgmtCompany: "",
    parentCompany: "",
    address: "",
    website: "",
    invoiceCollection: "",
    compliancePartner: "No",
    riskValue: "Low",
    propertyManager: "",
    email: "",
    phone: "",
    clientStatus: "Active",
    servicesInterestedIn: "Rehabs",
  })

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (!userData) {
      router.push("/login")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
    } catch (error) {
      console.error("[v0] Error parsing user data:", error)
      router.push("/login")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const clientData = {
        Client_Community: formData.clientCommunity,
        Parent_Mgmt_Company: formData.parentMgmtCompany,
        Parent_Company: formData.parentCompany,
        Address: formData.address,
        Website: formData.website,
        Invoice_Collection: formData.invoiceCollection,
        Compliance_Partner: formData.compliancePartner,
        Risk_Value: formData.riskValue,
        Prop_Manager: formData.propertyManager,
        Email_Address: formData.email,
        Phone_Number: formData.phone,
        Client_Status: formData.clientStatus,
        Services_interested_in: formData.servicesInterestedIn,
      }

      console.log("[v0] Creating client:", clientData)

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientData),
      })

      if (!response.ok) {
        throw new Error("Failed to create client")
      }

      const createdClient = await response.json()
      console.log("[v0] Client created:", createdClient)

      toast.success("Client created successfully")
      router.push("/clients")
    } catch (error) {
      console.error("[v0] Error creating client:", error)
      toast.error("Failed to create client. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gqm-green-dark" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Create New Client</h1>
              <p className="text-muted-foreground">Fill in the details to create a new client</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="clientCommunity" className="mb-2 block font-bold">
                    Client Community *
                  </Label>
                  <Input
                    id="clientCommunity"
                    placeholder="Enter client community name"
                    required
                    value={formData.clientCommunity}
                    onChange={(e) => setFormData({ ...formData, clientCommunity: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="parentMgmtCompany" className="mb-2 block font-bold">
                      Parent Management Company *
                    </Label>
                    <Input
                      id="parentMgmtCompany"
                      placeholder="Enter parent management company"
                      required
                      value={formData.parentMgmtCompany}
                      onChange={(e) => setFormData({ ...formData, parentMgmtCompany: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="parentCompany" className="mb-2 block font-bold">
                      Parent Company *
                    </Label>
                    <Input
                      id="parentCompany"
                      placeholder="Enter parent company"
                      required
                      value={formData.parentCompany}
                      onChange={(e) => setFormData({ ...formData, parentCompany: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="mb-2 block font-bold">
                    Address *
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Enter full address"
                    rows={2}
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="website" className="mb-2 block font-bold">
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="propertyManager" className="mb-2 block font-bold">
                    Property Manager *
                  </Label>
                  <Input
                    id="propertyManager"
                    placeholder="Enter property manager name"
                    required
                    value={formData.propertyManager}
                    onChange={(e) => setFormData({ ...formData, propertyManager: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="email" className="mb-2 block font-bold">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="mb-2 block font-bold">
                      Phone Number *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1-555-555-5555"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="invoiceCollection" className="mb-2 block font-bold">
                    Invoice Collection *
                  </Label>
                  <Input
                    id="invoiceCollection"
                    placeholder="e.g., Submit through Ops Merchant"
                    required
                    value={formData.invoiceCollection}
                    onChange={(e) => setFormData({ ...formData, invoiceCollection: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="compliancePartner" className="mb-2 block font-bold">
                      Compliance Partner *
                    </Label>
                    <Select
                      required
                      value={formData.compliancePartner}
                      onValueChange={(value) => setFormData({ ...formData, compliancePartner: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="riskValue" className="mb-2 block font-bold">
                      Risk Value *
                    </Label>
                    <Select
                      required
                      value={formData.riskValue}
                      onValueChange={(value) => setFormData({ ...formData, riskValue: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="clientStatus" className="mb-2 block font-bold">
                      Client Status *
                    </Label>
                    <Select
                      required
                      value={formData.clientStatus}
                      onValueChange={(value) => setFormData({ ...formData, clientStatus: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="servicesInterestedIn" className="mb-2 block font-bold">
                      Services Interested In *
                    </Label>
                    <Select
                      required
                      value={formData.servicesInterestedIn}
                      onValueChange={(value) => setFormData({ ...formData, servicesInterestedIn: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rehabs">Rehabs</SelectItem>
                        <SelectItem value="Work Orders">Work Orders</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Client
                  </>
                )}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
