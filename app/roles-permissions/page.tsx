"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Users, Plus } from "lucide-react"
import PermissionsTable from "@/components/organisms/roles-permissions/PermissionsTable"
import RolesTable from "@/components/organisms/roles-permissions/RolesTable"

type Tab = "permissions" | "roles"

export default function RolesPermissionsPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [tab, setTab] = useState<Tab>("permissions")

    useEffect(() => {
        const userData = localStorage.getItem("user_data")
        if (!userData) {
            router.push("/login")
            return
        }
        setUser(JSON.parse(userData))
    }, [router])

    if (!user) return null

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar user={user} />

                <main className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Roles & Permissions</h1>
                            <p className="text-sm text-muted-foreground">Manage access control for admin panel sections.</p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={tab === "permissions" ? "default" : "outline"}
                                    onClick={() => setTab("permissions")}
                                    className={tab === "permissions" ? "bg-gqm-green text-white hover:bg-gqm-green/90" : ""}
                                >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Permissions
                                </Button>

                                <Button
                                    variant={tab === "roles" ? "default" : "outline"}
                                    onClick={() => setTab("roles")}
                                    className={tab === "roles" ? "bg-gqm-green text-white hover:bg-gqm-green/90" : ""}
                                >
                                    <Users className="mr-2 h-4 w-4" />
                                    Roles
                                </Button>
                            </div>

                            <Button
                                onClick={() =>
                                    router.push(tab === "permissions" ? "/roles-permissions/create-permissions" : "/roles-permissions/create-roles")
                                }
                                className="gap-2 bg-gqm-green text-white hover:bg-gqm-green/90"
                            >
                                <Plus className="h-4 w-4" />
                                {tab === "permissions" ? "Create Permission" : "Create Role"}
                            </Button>
                        </div>
                    </div>

                    <Card className="p-6">
                        {tab === "permissions" ? <PermissionsTable /> : <RolesTable />}
                    </Card>
                </main>
            </div>
        </div>
    )
}
