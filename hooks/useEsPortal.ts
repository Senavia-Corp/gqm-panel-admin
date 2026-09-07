"use client"

import { useEffect, useState } from "react"

import { isPortalRole, roleSlugFromCookie, type RoleSlug } from "@/lib/role-map"

/**
 * ¿Es esta sesión un rol de portal? Con el «todavía no lo sé» resuelto hacia
 * el lado seguro.
 *
 * `roleSlugFromCookie()` lee `document.cookie`, que en el render del SERVIDOR
 * no existe: devuelve `null`. Y `isPortalRole(null)` es `false`, es decir
 * «rol interno». Así que todos los guardas escritos como
 * `{!isPortalRole(roleSlugFromCookie()) && <Boton/>}` eran FAIL-OPEN: en el
 * HTML del servidor —y en el primer render del cliente, antes de hidratar— el
 * botón prohibido SÍ se pintaba, y sólo desaparecía después.
 *
 * Aquí el desconocido cuenta como portal: **ocultar de más y luego mostrar es
 * recuperable; enseñar un control prohibido y quitarlo después, no.** Un
 * administrador ve aparecer sus botones un instante más tarde; un
 * subcontratista no llega a ver los que no son suyos.
 *
 * Se resuelve en un efecto y no durante el render para que el HTML del
 * servidor y el primer render del cliente coincidan: leer la cookie
 * directamente en el cuerpo del componente provoca un desajuste de hidratación.
 */
export function useEsPortal(): { esPortal: boolean; rol: RoleSlug | null; resuelto: boolean } {
  const [rol, setRol] = useState<RoleSlug | null>(null)
  const [resuelto, setResuelto] = useState(false)

  useEffect(() => {
    setRol(roleSlugFromCookie())
    setResuelto(true)
  }, [])

  return { esPortal: !resuelto || isPortalRole(rol), rol, resuelto }
}
