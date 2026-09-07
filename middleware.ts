import { NextResponse, type NextRequest } from "next/server"

import type { RoleSlug } from "@/lib/role-map"
import { PORTAL_DENY, PORTAL_PREFIXES, bajoAlgunPrefijo } from "@/lib/portal-routes"

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
const FULL_ADMIN_ONLY = ["/roles-permissions", "/members", "/commissions"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("gqm_at")?.value

  // ── API: chokepoint de Authorization ────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    // Solo el ciclo de sesión es público; el resto de /api/auth (p.ej. /can)
    // necesita el Authorization inyectado como cualquier otra ruta.
    const PUBLIC_API = ["/api/auth/login", "/api/auth/refresh", "/api/auth/logout",
      "/api/auth/forgot-password", "/api/auth/reset-password"]
    if (PUBLIC_API.some((p) => pathname === p)) return NextResponse.next()
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

  // Las páginas públicas (forgot/reset) son accesibles también con sesión
  if (isPublic) return NextResponse.next()

  // Cookie de rol AUSENTE (sesión vieja, cookie caducada o borrada) ≠ rol
  // `none`: antes se degradaba en silencio a gqm_member; ahora se cierra la
  // sesión. `none` solo si la cookie lo dice (member sin ID_Role).
  const roleCookie = request.cookies.get("gqm_role")?.value
  if (!roleCookie) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    const res = NextResponse.redirect(url)
    res.cookies.delete("gqm_at")
    return res
  }
  const role = roleCookie as RoleSlug

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
    const uid = request.cookies.get("gqm_uid")?.value
    const home =
      uid && role === "subcontractor" ? `/subcontractors/${uid}` : portalPrefixes[0]

    // El deny va ANTES del allow: `/jobs/create` cae bajo el prefijo `/jobs`,
    // así que sin esto el prefijo lo dejaría pasar.
    const denegado = bajoAlgunPrefijo(pathname, PORTAL_DENY[role] ?? [])

    const allowed =
      !denegado &&
      (pathname === "/" || bajoAlgunPrefijo(pathname, portalPrefixes))
    if (!allowed) {
      const url = request.nextUrl.clone()
      url.pathname = home
      url.search = ""
      return NextResponse.redirect(url)
    }

    // U-03: el prefijo `/subcontractors` se comparaba SIN mirar el id, así que
    // `/subcontractors/<otro>` pasaba y la ficha ajena se pintaba. La única
    // guarda de pertenencia de la página estaba escrita para LEAD_TECHNICIAN,
    // un rol que el backend no emite. Aquí se compara contra `gqm_uid`, que la
    // escribe el servidor en el login junto con `gqm_role`.
    if (role === "subcontractor" && uid && pathname.startsWith("/subcontractors/")) {
      const requested = pathname.split("/")[2]
      if (requested && requested !== uid) {
        const url = request.nextUrl.clone()
        url.pathname = home
        url.search = ""
        return NextResponse.redirect(url)
      }
    }

    // U-18 (retirado): aquí vivía la guarda por id de `/technicians/<otro>`
    // para el rol técnico. Ya no hace falta: `/technicians` salió entero de
    // sus prefijos, así que cualquier ficha de técnico —la suya incluida— la
    // rebota el `allowed` de arriba. Una guarda que defiende un prefijo que ya
    // no se concede es peor que ninguna: invita a creer que el prefijo sigue.
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|woff2?)).*)",
  ],
}
