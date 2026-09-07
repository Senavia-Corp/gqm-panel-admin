/**
 * Espejo de `src/utils/password_policy.py` del API.
 *
 * O-06 (auditoría de portal): el panel enseñaba una lista de requisitos
 * —«8+ chars», una mayúscula, un dígito— y la marcaba en verde, pero quien
 * decide es el servidor, que pide 10 caracteres y 3 de 4 tipos. Medido con
 * HTTP crudo contra `POST /technician/`:
 *
 *   'Abcdefg1'   (8)  → panel ACEPTA · servidor 400
 *   'Abcdefgh1'  (9)  → panel ACEPTA · servidor 400
 *   'Abcdefghi1' (10) → panel ACEPTA · servidor 201
 *
 * El administrador rellenaba el formulario entero con todo en verde y recibía
 * un 400 al final. Con 432 altas por delante, eso no es una molestia: es el
 * trabajo hecho dos veces cada vez.
 *
 * Esta comprobación NO sustituye a la del servidor —un `curl` se la salta—;
 * sirve para que lo que el panel promete sea lo que el API cumple.
 */

export const LONGITUD_MINIMA = 10

/** Misma lista que `CONTRASENAS_PROHIBIDAS` en el API. */
export const CONTRASENAS_PROHIBIDAS: ReadonlySet<string> = new Set([
  "password", "contrasena", "contraseña", "12345678", "123456789", "1234567890",
  "qwertyui", "abcd1234", "admin123", "gqm12345", "password1", "password123",
  "welcome1", "changeme", "letmein1", "iloveyou", "senavia1", "subcontractor",
])

export function clasesDeCaracter(password: string): number {
  return [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/]
    .filter((re) => re.test(password)).length
}

export type ReglaPassword = { clave: string; ok: boolean; texto: string }

/**
 * Las reglas, en el mismo orden en que el servidor las comprueba, para poder
 * pintarlas como lista de requisitos.
 */
export function reglasPassword(password: string): ReglaPassword[] {
  const p = password ?? ""
  return [
    {
      clave: "longitud",
      ok: p.length >= LONGITUD_MINIMA,
      texto: `At least ${LONGITUD_MINIMA} characters`,
    },
    {
      clave: "clases",
      ok: clasesDeCaracter(p) >= 3,
      texto: "3 of: lowercase, uppercase, digit, symbol",
    },
    {
      clave: "comun",
      ok: p.length > 0 && !CONTRASENAS_PROHIBIDAS.has(p.toLowerCase()),
      texto: "Not a commonly used password",
    },
    {
      clave: "repetida",
      ok: p.length > 0 && !/^(.)\1+$/.test(p),
      texto: "Not a single repeated character",
    },
  ]
}

export function passwordValida(password: string): boolean {
  return !!password && reglasPassword(password).every((r) => r.ok)
}

/** Primer motivo de rechazo, o null si cumple. Mismo orden que el servidor. */
export function motivoRechazo(password: string): string | null {
  if (!password || !password.trim()) return "Password cannot be empty."
  const fallo = reglasPassword(password).find((r) => !r.ok)
  return fallo ? fallo.texto : null
}
