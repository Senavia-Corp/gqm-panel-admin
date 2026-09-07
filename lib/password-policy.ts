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

/**
 * Longitud en PUNTOS DE CÓDIGO, no en unidades UTF-16.
 *
 * `"🙂".length` es 2 en JavaScript y 1 en Python. Medido pasando un corpus de
 * 50 entradas por las dos implementaciones: `'Ab1🙂🙂🙂🙂'` mide 7 para
 * `len()` de Python y 11 para `.length` de JS, así que el panel la daba por
 * buena y el servidor respondía 400. `[...p]` recorre el iterador de cadena,
 * que va por punto de código, igual que Python.
 */
export function longitud(password: string): number {
  return [...(password ?? "")].length
}

export type ReglaPassword = { clave: string; ok: boolean; texto: string }

/**
 * Las reglas EN EL MISMO ORDEN en que las comprueba el servidor
 * (`validar_password`): vacía → longitud → lista de prohibidas → clases →
 * carácter repetido. El orden importa porque `motivoRechazo` devuelve la
 * primera que falla, y con el orden cambiado el panel daba un motivo distinto
 * al del API en 11 de 50 casos de un corpus de prueba.
 *
 * `texto` es el de reserva, en inglés. Las pantallas usan `usePasswordRules`
 * (hooks/usePasswordPolicy.ts), que traduce por `clave`.
 */
export function reglasPassword(password: string): ReglaPassword[] {
  const p = password ?? ""
  // Con el campo VACÍO, las reglas negativas no están «incumplidas»: no hay
  // nada que sea común ni repetido todavía. Marcarlas en rojo hacía que dos
  // pantallas listaran «Not a commonly used password» como error de un campo
  // en blanco, que no dice nada a nadie.
  const vacia = p.length === 0
  return [
    {
      clave: "longitud",
      ok: longitud(p) >= LONGITUD_MINIMA,
      texto: `At least ${LONGITUD_MINIMA} characters`,
    },
    {
      clave: "comun",
      ok: vacia || !CONTRASENAS_PROHIBIDAS.has(p.toLowerCase()),
      texto: "Not a commonly used password",
    },
    {
      clave: "repetida",
      ok: vacia || !/^(.)\1+$/u.test(p),
      texto: "Not a single repeated character",
    },
    {
      clave: "clases",
      ok: clasesDeCaracter(p) >= 3,
      texto: "3 of: lowercase, uppercase, digit, symbol",
    },
  ]
}

export function passwordValida(password: string): boolean {
  return !!password && reglasPassword(password).every((r) => r.ok)
}

/** Primera regla incumplida, o null si cumple. Mismo orden que el servidor. */
export function reglaIncumplida(password: string): ReglaPassword | null {
  if (!password || !password.trim()) {
    return { clave: "vacia", ok: false, texto: "Password cannot be empty" }
  }
  return reglasPassword(password).find((r) => !r.ok) ?? null
}

/** El motivo en inglés. Para mensajes traducidos, `usePasswordPolicy`. */
export function motivoRechazo(password: string): string | null {
  const fallo = reglaIncumplida(password)
  return fallo ? fallo.texto : null
}
