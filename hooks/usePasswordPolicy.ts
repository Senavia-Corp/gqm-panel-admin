"use client"

import { useTranslations } from "@/components/providers/LocaleProvider"
import {
  LONGITUD_MINIMA,
  reglaIncumplida,
  reglasPassword,
  type ReglaPassword,
} from "@/lib/password-policy"

/**
 * Las reglas de contraseña TRADUCIDAS.
 *
 * `lib/password-policy.ts` es un módulo sin acceso a i18n, así que devuelve el
 * texto en inglés. El panel es bilingüe: medido con la cookie `gqm_locale=es`,
 * la pantalla de reset salía con el título en español y la lista de requisitos
 * en inglés, y el aviso de error contradecía a la descripción.
 *
 * Este hook traduce por `clave`, que es estable, y deja el inglés de reserva si
 * faltara la traducción.
 */
export function usePasswordPolicy() {
  const t = useTranslations("passwordPolicy")

  const CLAVES: Record<string, string> = {
    longitud: "policyLength",
    clases: "policyClasses",
    comun: "policyCommon",
    repetida: "policyRepeated",
    vacia: "policyEmpty",
  }

  const traduce = (r: ReglaPassword): string => {
    const clave = CLAVES[r.clave]
    if (!clave) return r.texto
    const texto = t(clave, { min: LONGITUD_MINIMA })
    // `t` devuelve la propia clave si no la encuentra: en ese caso, el inglés.
    return texto && texto !== clave ? texto : r.texto
  }

  return {
    /** Las cuatro reglas, en el orden del servidor, con el texto traducido. */
    reglas: (password: string) =>
      reglasPassword(password).map((r) => ({ ...r, texto: traduce(r) })),
    /** El motivo del rechazo, traducido, o null si cumple. */
    motivo: (password: string): string | null => {
      const fallo = reglaIncumplida(password)
      return fallo ? traduce(fallo) : null
    },
  }
}
