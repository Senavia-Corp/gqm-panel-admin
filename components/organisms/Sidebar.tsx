"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { usePermissions } from "@/hooks/usePermissions"
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCircle,
  UsersRound,
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
  Store,
} from "lucide-react"
import { Logo } from "@/components/atoms/Logo"
import { Button } from "@/components/ui/button"
import type { ElementType } from "react"
import type { UserRole } from "@/lib/types"

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  icon: ElementType
  labelKey: string
  href: string
}

// ─── Static nav config (icons + routes only — labels translated at render) ────

const gqmMemberMenuItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "dashboard",          href: "/dashboard" },
  { icon: Briefcase,       labelKey: "jobs",               href: "/jobs" },
  { icon: Users,           labelKey: "subcontractors",     href: "/subcontractors" },
  { icon: UserCircle,      labelKey: "clients",            href: "/clients" },
  { icon: UsersRound,      labelKey: "members",            href: "/members" },
  { icon: ShoppingBag,     labelKey: "purchases",          href: "/purchases" },
  { icon: BadgeDollarSign, labelKey: "commissions",        href: "/commissions" },
  { icon: Landmark,        labelKey: "buildingDepartments",href: "/building-departments" },
  { icon: Megaphone,       labelKey: "opportunities",      href: "/opportunities" },
  { icon: Store,           labelKey: "suppliers",          href: "/suppliers" },
  { icon: FileBadge,       labelKey: "rolesPermissions",   href: "/roles-permissions" },
]

const leadTechnicianMenuItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "dashboard",    href: "/dashboard" },
  { icon: Briefcase,       labelKey: "jobs",         href: "/jobs" },
  { icon: Wrench,          labelKey: "technicians",  href: "/technicians" },
  { icon: FileText,        labelKey: "reports",      href: "/reports" },
]

const bottomItems: NavItem[] = [
  { icon: UserCircle, labelKey: "profile",  href: "/profile" },
  { icon: Settings,   labelKey: "settings", href: "/settings" },
  { icon: LogOut,     labelKey: "logout",   href: "/login" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const pathname = usePathname()
  const t = useTranslations("navigation")

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
      if (item.href === "/members")              return hasPermission("member:read")
      if (item.href === "/clients")             return hasPermission("client:read") || hasPermission("parent_mgmt_co:read")
      if (item.href === "/subcontractors")      return hasPermission("subcontractor:read")
      if (item.href === "/building-departments")return hasPermission("bldg_dept:read")
      if (item.href === "/opportunities")       return hasPermission("subcontractor:read")
      if (item.href === "/suppliers")           return hasPermission("subcontractor:read")
      if (item.href === "/roles-permissions")   return hasPermission("iam_pm:read")
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
      className={`relative flex h-screen flex-col border-r bg-white transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
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
                className={`w-full justify-start gap-3 ${isActive ? "bg-gray-100" : ""} ${
                  isDisabled ? "opacity-50" : ""
                }`}
                size={collapsed ? "icon" : "default"}
                disabled={isDisabled}
              >
                <Icon className="h-5 w-5" />
                {!collapsed && <span>{t(item.labelKey as any)}</span>}
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
          const isLogout = item.labelKey === "logout"

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
                {!collapsed && <span>{t(item.labelKey as any)}</span>}
              </Button>
            </Link>
          )
        })}
      </div>

      {/* Collapse toggle */}
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
