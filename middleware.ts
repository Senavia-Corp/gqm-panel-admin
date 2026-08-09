import { NextResponse, type NextRequest } from "next/server"

import type { RoleSlug } from "@/lib/role-map"

/**
 * Protección server-side de la sesión httpOnly (REG-109/REG-046/REG-039):
 *
 * - /api/*: inyecta `Authorization: Bearer <gqm_at>` desde la cookie httpOnly
 *   en la request — chokepoint único: los ~100 handlers proxy reenvían ese
 *   header al backend Python sin tocar tokens en el cliente.
 * - Páginas: sin cookie → redirect a /login. Gating por rol con la cookie
 *   legible gqm_role (la autorización real la impone el API por políticas).
 * - Subcontratistas/técnicos solo ven su subárbol (scoping de datos en el API).
 */

const PUBLIC_PAGES = ["/login", "/forgot-password", "/reset-password"]
const FULL_ADMIN_ONLY = ["/roles-permissions"]
// Prefijos permitidos para los roles de portal (además de /profile)
const PORTAL_PREFIXES: Record<string, string[]> = {
  subcontractor: ["/subcontractors", "/profile"],
  technical: ["/subcontractors", "/technicians", "/profile"],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("gqm_at")?.value

  // ── API: chokepoint de Authorization ────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/auth/")) return NextResponse.next()
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    const headers = new Headers(request.headers)
    if (!headers.has("authorization")) {
      headers.set("authorization", `Bearer ${token}`)
    }
    return NextResponse.next({ request: { headers } })
  }

  // ── Páginas ─────────────────────────────────────────────────────────────
  const isPublic = PUBLIC_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )

  if (!token) {
    if (isPublic) return NextResponse.next()
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  const role = (request.cookies.get("gqm_role")?.value || "gqm_member") as RoleSlug

  if (
    role !== "full_admin" &&
    FULL_ADMIN_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  const portalPrefixes = PORTAL_PREFIXES[role]
  if (portalPrefixes) {
    const allowed =
      pathname === "/" ||
      portalPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    if (!allowed) {
      const url = request.nextUrl.clone()
      const uid = request.cookies.get("gqm_uid")?.value
      url.pathname = uid && role === "subcontractor"
        ? `/subcontractors/${uid}`
        : portalPrefixes[0]
      url.search = ""
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|woff2?)).*)",
  ],
}
