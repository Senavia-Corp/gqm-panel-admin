/**
 * Rutas que un rol de portal puede abrir. FUENTE ÚNICA.
 *
 * Esta tabla vivía en `middleware.ts` y estaba copiada A MANO en dos ficheros
 * de prueba —`tests/rbac/helpers.ts` (`homeFor`) y `tests/rbac/dead_links.spec.ts`
 * (`PREFIJOS_PORTAL`)—, así que cambiar los prefijos obligaba a tocar tres
 * sitios. Si se olvida uno, el resultado no es un fallo ruidoso: la barrida de
 * enlaces de `dead_links` compara contra la copia vieja y o bien denuncia como
 * fuera de alcance una ruta recién abierta (rojo falso), o bien deja pasar una
 * que ya no lo está (verde falso). Las dos mienten igual de bien.
 */

export type RolPortal = "subcontractor" | "technical" | "none"

/** Prefijos permitidos por rol. El primero es además el destino de la
 *  redirección cuando se pide algo fuera de la lista. */
export const PORTAL_PREFIXES: Record<string, string[]> = {
  // El subcontratista trabaja sus obras: su ficha y la lista de trabajos.
  // `/jobs` entra aquí junto con el recorte del detalle (Details + Tasks +
  // Documents) y con el de la lista; abrirlo antes que aquello le enseñaría
  // Pricing y Purchases a una URL de distancia.
  subcontractor: ["/subcontractors", "/jobs", "/profile"],
  // El técnico: sus tareas y su perfil, y nada más. `/dashboard` le sirve su
  // tablero de tareas. Sale `/technicians`: la ficha de técnico es superficie
  // de gestión del subcontratista, no del técnico.
  technical: ["/dashboard", "/profile"],
  // Member sin rol: solo su perfil (sin bucle, /profile está permitido)
  none: ["/profile"],
}

/**
 * Excepciones DENTRO de un prefijo permitido.
 *
 * `/jobs` se compara por prefijo, así que abrirlo abre también `/jobs/create`.
 * El subcontratista no tiene `job:create`: el formulario cargaría entero para
 * terminar en un 403 al guardar. Se corta antes.
 */
export const PORTAL_DENY: Record<string, string[]> = {
  subcontractor: ["/jobs/create"],
}

/** ¿`pathname` cae bajo alguno de estos prefijos? */
export function bajoAlgunPrefijo(pathname: string, prefijos: string[]): boolean {
  return prefijos.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
