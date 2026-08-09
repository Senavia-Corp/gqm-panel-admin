import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"

import enMessages from "../messages/en.json"
import esMessages from "../messages/es.json"

// REG-138: el locale del usuario vive en la cookie gqm_locale (la escribe
// LocaleProvider). El SSR renderiza en el mismo idioma que el cliente;
// default inglés (decisión confirmada).
export default getRequestConfig(async () => {
  const saved = (await cookies()).get("gqm_locale")?.value
  const locale = saved === "es" ? "es" : "en"
  return {
    locale,
    messages: locale === "es" ? esMessages : enMessages,
  }
})
