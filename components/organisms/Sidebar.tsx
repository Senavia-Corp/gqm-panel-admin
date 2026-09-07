"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { useSidebar } from "@/components/providers/SidebarContext"
import { logout } from "@/lib/auth-utils"
import { usePermissions } from "@/hooks/usePermissions"
import { useCan } from "@/hooks/useCan"
import packageJson from "../../package.json"
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
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import type { ElementType } from "react"
import { uidFromCookie, type RoleSlug } from "@/lib/role-map"
import { useEsPortal } from "@/hooks/useEsPortal"

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

// U-05 · El menú del portal solo pinta rutas que ese rol puede abrir de
// verdad: estas dos listas tienen que ser un subconjunto de `PORTAL_PREFIXES`
// (`lib/portal-routes.ts`), o se vuelve a prometer lo que el middleware niega
// —que es como estaban: 2 de los 3 enlaces del sub y los 2 del técnico
// llevaban a un rebote.
//
// El subcontratista tiene su ficha (el href se reescribe abajo con el id de
// sesión) y «Trabajos», que reutiliza /jobs: el API ya le acota la lista a sus
// obras, filas y total (scope_jobs_statement), así que no hace falta filtro en
// el cliente ni una ruta aparte.
const subcontractorMenuItems: NavItem[] = [
  { icon: Users,     labelKey: "subcontractors", href: "/subcontractors" },
  { icon: Briefcase, labelKey: "jobs",           href: "/jobs" },
]

// El técnico solo tiene /dashboard, que le sirve su tablero de tareas.
const leadTechnicianMenuItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "dashboard",    href: "/dashboard" },
]

const bottomItems: NavItem[] = [
  { icon: UserCircle, labelKey: "profile",  href: "/profile" },
  { icon: Settings,   labelKey: "settings", href: "/settings" },
  { icon: LogOut,     labelKey: "logout",   href: "/login" },
]

// ─── Shared nav content ───────────────────────────────────────────────────────

interface SidebarContentProps {
  collapsed: boolean
  menuItems: NavItem[]
  roleSlug: RoleSlug | null
  /** Ya resuelto por `useEsPortal()`: el desconocido cuenta como portal. */
  esPortal: boolean
  pathname: string
  onNavigate?: () => void
}

function SidebarContent({
  collapsed,
  menuItems,
  roleSlug,
  esPortal,
  pathname,
  onNavigate,
}: SidebarContentProps) {
  const t = useTranslations("navigation")

  const handleLogout = () => {
    // Sesión httpOnly: borra cookies server-side + estado de UI y redirige
    logout()
  }

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && <Logo />}
        {collapsed && <Logo showText={false} />}
      </div>

      {/* Notifications placeholder */}
      <div className="border-b px-4 py-3" />

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const isDisabled = esPortal && item.href === "/reports"

          return (
            <Link
              key={item.href}
              href={isDisabled ? "#" : item.href}
              className={isDisabled ? "pointer-events-none" : ""}
              onClick={!isDisabled ? onNavigate : undefined}
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
          // /settings no está en PORTAL_PREFIXES: el middleware lo rebota
          // para subcontratista y técnico, así que no se ofrece a ninguno.
          const isDisabled = esPortal && item.href === "/settings"
          const isLogout = item.labelKey === "logout"

          return (
            <Link
              key={item.href}
              href={isDisabled ? "#" : item.href}
              className={isDisabled ? "pointer-events-none" : ""}
              onClick={(e) => {
                if (isLogout) {
                  // logout() borra cookies y redirige él mismo: cancelar el
                  // Link para no navegar a /login antes de borrar la sesión
                  e.preventDefault()
                  handleLogout()
                  return
                }
                if (!isDisabled) onNavigate?.()
              }}
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

        {/* Version Indicator */}
        <div className={`mt-4 text-center ${collapsed ? "text-[8px]" : "text-[10px]"} text-gray-400 font-medium`}>
          v{packageJson.version}
        </div>
      </div>
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  // Rol e id de la SESIÓN (cookies gqm_role/gqm_uid), no
  // `localStorage.user_data`: el menú debe coincidir con lo que evalúa el
  // middleware, y localStorage se reescribe desde devtools (D6).
  // El rol de la sesión, con el «todavía no lo sé» resuelto hacia el lado
  // seguro. Antes era un `useState(null)` propio y `isPortalRole(null)` es
  // `false`, es decir «rol interno»: en el PRIMER render un subcontratista
  // veía el menú de GQM Member entero (el `let base = gqmMemberMenuItems` de
  // abajo) y los enlaces a /reports y /settings habilitados, y sólo después
  // se corregían. Ver hooks/useEsPortal.ts.
  const { esPortal, rol: roleSlug, resuelto: rolResuelto } = useEsPortal()
  const [userId, setUserId] = useState<string | null>(null)
  const pathname = usePathname()
  const { isOpen, setIsOpen } = useSidebar()
  const t = useTranslations("navigation")

  useEffect(() => {
    // El id sale de la misma cookie que usa el middleware para redirigir, de
    // modo que el enlace del sub apunte exactamente a la ficha que le deja
    // abrir. localStorage queda solo como reserva si la cookie viniera vacía.
    const fromCookie = uidFromCookie()
    if (fromCookie) { setUserId(fromCookie); return }
    const userData = localStorage.getItem("user_data")
    if (userData) {
      const user = JSON.parse(userData)
      setUserId(localStorage.getItem("user_id") ?? user.id ?? user.user_id ?? user.ID_Member ?? user.ID_Technician ?? user.ID_Subcontractor)
    }
  }, [])

  // Auto-close mobile drawer on navigation
  useEffect(() => {
    setIsOpen(false)
  }, [pathname, setIsOpen])

  const { hasPermission } = usePermissions()
  // Miembros y comisiones: lo decide el servidor (/auth/can), no la copia
  // local de políticas, para que el menú coincida con lo que el API permite.
  const { can } = useCan(["member:read", "commission:read"])

  const menuItems = useMemo(() => {
    // Sin rol resuelto no se pinta menú: el defecto de abajo es el de GQM
    // Member, así que pintarlo «mientras tanto» se lo enseña al portal.
    if (!rolResuelto) return []
    let base = gqmMemberMenuItems
    if (roleSlug === "subcontractor") {
      base = subcontractorMenuItems.map(item => 
        item.href === "/subcontractors" && userId 
          ? { ...item, href: `/subcontractors/${userId}` } 
          : item
      )
    }
    else if (roleSlug === "technical") base = leadTechnicianMenuItems
    
    return base.filter((item) => {
      if (item.href === "/members")              return can("member:read")
      if (item.href === "/clients")             return hasPermission("client:read") || hasPermission("parent_mgmt_co:read")
      if (item.href === "/subcontractors")      return hasPermission("subcontractor:read")
      // Catálogos. `supplier_bp` y `bldg_dept_bp` no llevan decoradores
      // propios: los protege `protect_blueprint(_bp, "catalog")` en el
      // `main.py` del API, y un GET exige por tanto `catalog:read`.
      //
      // Antes pedían `subcontractor:read` y `bldg_dept:read`, permisos que no
      // tienen nada que ver con lo que el API comprueba. Hoy no se nota porque
      // los 13 miembros reales están en políticas con comodín `*` y las cuatro
      // acciones les evalúan a true. Pero la política «Full Permission»
      // concede `subcontractor:read` y NO `catalog:read`: en cuanto alguien
      // tenga ese rol, vería Suppliers y recibiría un 403 del API. Y
      // `bldg_dept:read` no lo concede NINGUNA política, así que ese enlace
      // depende por completo de que el rol tenga comodín — un rol con
      // `catalog:read` explícito no vería Building Depts pese a poder entrar.
      //
      // El enlace debe preguntar exactamente lo que el API va a exigir.
      if (item.href === "/building-departments")return hasPermission("catalog:read")
      if (item.href === "/suppliers")           return hasPermission("catalog:read")
      // `opportunities_bp` va con `protect_blueprint(_bp, "client")`, no con
      // catalog: su lectura exige `client:read`.
      if (item.href === "/opportunities")       return hasPermission("client:read")
      // Comisiones no tenía gate alguno: caía en el `return true` de abajo y
      // la veía todo el mundo. El control real es el Deny de commission:* en
      // la política del rol; esto solo evita ofrecer un enlace a un 403.
      if (item.href === "/commissions")         return can("commission:read")
      if (item.href === "/roles-permissions") {
        // Mismo criterio que FULL_ADMIN_ONLY del middleware (cookie gqm_role):
        // el chequeo viejo usaba el vocabulario fósil iam_pm:read y mostraba
        // el enlace a roles que el middleware luego rebotaba al dashboard.
        return typeof document !== "undefined" &&
          /(?:^|;\s*)gqm_role=full_admin(?:;|\s|$)/.test(document.cookie)
      }
      return true
    })
  }, [rolResuelto, roleSlug, userId, hasPermission, can])

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────────────────── */}
      <aside
        className={`relative hidden h-screen flex-col border-r bg-white transition-all duration-300 lg:flex ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          menuItems={menuItems}
          roleSlug={roleSlug}
          esPortal={esPortal}
          pathname={pathname}
        />

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          aria-expanded={!collapsed}
          className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-white shadow-md"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </aside>

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 [&>button[data-slot='sheet-close']]:top-5 [&>button[data-slot='sheet-close']]:right-3"
        >
          <VisuallyHidden>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden>
          <SidebarContent
            collapsed={false}
            menuItems={menuItems}
            roleSlug={roleSlug}
            esPortal={esPortal}
            pathname={pathname}
            onNavigate={() => setIsOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
