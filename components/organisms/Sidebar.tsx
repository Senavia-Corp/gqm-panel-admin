"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { usePermissions } from "@/hooks/usePermissions"
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCircle,
  UsersRound,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wrench,
  FileText,
  ShoppingBag,
  FileBadge,
  BadgeDollarSign,
  Landmark,
  Megaphone,
} from "lucide-react"
import { Logo } from "@/components/atoms/Logo"
import { Button } from "@/components/ui/button"
import type { UserRole } from "@/lib/types"

const gqmMemberMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Briefcase, label: "Jobs", href: "/jobs" },
  { icon: Users, label: "Subcontractors", href: "/subcontractors" },
  { icon: UserCircle, label: "Clients", href: "/clients" },
  { icon: UsersRound, label: "GQM Members", href: "/members" },
  { icon: ShoppingBag, label: "Purchases", href: "/purchases" },
  { icon: BadgeDollarSign, label: "Commissions", href: "/commissions" },
  { icon: Landmark, label: "Building Depts", href: "/building-departments" },
  { icon: Megaphone, label: "Opportunities", href: "/opportunities" },
  { icon: FileBadge, label: "Roles & Permissions", href: "/roles-permissions" },
]

const leadTechnicianMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Briefcase, label: "Jobs", href: "/jobs" },
  { icon: Wrench, label: "Technicians", href: "/technicians" },
  { icon: FileText, label: "Reports", href: "/reports" },
]

const bottomItems = [
  { icon: UserCircle, label: "Profile", href: "/profile" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: LogOut, label: "Log out", href: "/login" },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (userData) {
      const user = JSON.parse(userData)
      setUserRole(user.role)
    }
  }, [])

  const { hasPermission } = usePermissions()

  const menuItems = useMemo(() => {
    const base = userRole === "LEAD_TECHNICIAN" ? leadTechnicianMenuItems : gqmMemberMenuItems
    return base.filter((item) => {
      if (item.href === "/members") return hasPermission("member:read")
      if (item.href === "/clients") return hasPermission("client:read") || hasPermission("parent_mgmt_co:read")
      if (item.href === "/subcontractors") return hasPermission("subcontractor:read")
      if (item.href === "/building-departments") return hasPermission("bldg_dept:read")
      if (item.href === "/opportunities") return hasPermission("subcontractor:read")
      if (item.href === "/roles-permissions") return hasPermission("iam_pm:read")
      return true
    })
  }, [userRole, hasPermission])

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("token_type")
    localStorage.removeItem("user_id")
    localStorage.removeItem("user_type")
    localStorage.removeItem("user_data")
    localStorage.removeItem("login_time")
  }

  return (
    <aside
      className={`relative flex h-screen flex-col border-r bg-white transition-all duration-300 ${collapsed ? "w-20" : "w-64"
        }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && <Logo />}
        {collapsed && <Logo showText={false} />}
      </div>

      {/* Notifications placeholder */}
      <div className="border-b px-4 py-3" />

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const isDisabled =
            userRole === "LEAD_TECHNICIAN" &&
            (item.href === "/technicians" || item.href === "/reports")

          return (
            <Link
              key={item.href}
              href={isDisabled ? "#" : item.href}
              className={isDisabled ? "pointer-events-none" : ""}
            >
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${isActive ? "bg-gray-100" : ""} ${isDisabled ? "opacity-50" : ""
                  }`}
                size={collapsed ? "icon" : "default"}
                disabled={isDisabled}
              >
                <Icon className="h-5 w-5" />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="space-y-1 border-t p-4">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const isDisabled =
            userRole === "LEAD_TECHNICIAN" &&
            (item.href === "/profile" || item.href === "/settings")
          const isLogout = item.label === "Log out"

          return (
            <Link
              key={item.href}
              href={isDisabled ? "#" : item.href}
              className={isDisabled ? "pointer-events-none" : ""}
              onClick={isLogout ? handleLogout : undefined}
            >
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 ${isDisabled ? "opacity-50" : ""}`}
                size={collapsed ? "icon" : "default"}
                disabled={isDisabled}
              >
                <Icon className="h-5 w-5" />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            </Link>
          )
        })}
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-white shadow-md"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </aside>
  )
}