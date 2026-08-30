import { useTranslations } from "@/components/providers/LocaleProvider"

/**
 * Catálogos cerrados de Supplier y sus etiquetas traducibles.
 *
 * El diseño es intencional: se GUARDA el valor corto del catálogo
 * ("Dade County") y se MUESTRA la etiqueta traducible ("Miami-Dade County",
 * `areas.area_Dade` en messages/*.json).
 *
 * Aquí se arreglan dos cosas que estaban rotas y que no se veían porque la
 * tabla `supplier` estaba vacía:
 *
 * 1. EL NAMESPACE. Las pantallas traducían estas claves con
 *    `useTranslations("suppliers")`, pero viven en los namespaces hermanos
 *    `specialties` y `areas`. Como `t()` cae a devolver la clave cuando no la
 *    encuentra (LocaleProvider.tsx:96-99), la ficha imprimía literalmente
 *    `spec_Doors` y `area_Dade` en pantalla.
 *
 * 2. LA DERIVACIÓN DE LA CLAVE. Se calculaba con
 *    `v.split("/")[0].split(" ")[0].replace(/[^a-zA-Z]/g,"")`, o sea la primera
 *    palabra. Acierta en 24 de los 27 valores y falla en tres:
 *      "Roll Up Doors"     -> spec_Roll  (la clave real es spec_RollUp)
 *      "Palm Beach County" -> area_Palm  (la real es area_PalmBeach)
 *      "St. Lucie County"  -> area_St    (la real es area_StLucie)
 *    Con los datos reales de Podio eso son 15 de 56 fichas. Una derivación que
 *    "casi siempre acierta" falla en silencio, así que se sustituye por un
 *    MAPA EXPLÍCITO: si un valor nuevo no está, se ve en seguida.
 *
 * Los catálogos vivían duplicados en `app/suppliers/[id]/page.tsx` y
 * `app/suppliers/create/page.tsx`. Se centralizan aquí para que la lista de
 * opciones y el mapa de claves no puedan separarse.
 */

/** Valor guardado -> clave i18n del namespace `specialties`. */
export const SPECIALITY_LABELS: Record<string, string> = {
  "Doors": "spec_Doors",
  "Windows/Glazing": "spec_Windows",
  "Plumbing Materials": "spec_Plumbing",
  "Fencing": "spec_Fencing",
  "Landscaping Supplies": "spec_Landscaping",
  "Tile/Flooring": "spec_Tile",
  "Stones/Masonry": "spec_Stones",
  "Rental Equip": "spec_Rental",
  "Electrical Materials": "spec_Electrical",
  "HVAC Materials": "spec_HVAC",
  "Paint Suppliers": "spec_Paint",
  "Roll Up Doors": "spec_RollUp",
  "Kitchen Cabinets": "spec_Kitchen",
  "Roofing Materials": "spec_Roofing",
  "Glass/Mirrors": "spec_Glass",
  "Construction Supplies": "spec_Construction",
  "Bathroom Supplies": "spec_Bathroom",
  "Gutters / Screens": "spec_Gutters",
}

/** Valor guardado -> clave i18n del namespace `areas`. */
export const COVERAGE_AREA_LABELS: Record<string, string> = {
  "Dade County": "area_Dade",
  "Broward County": "area_Broward",
  "Palm Beach County": "area_PalmBeach",
  "St. Lucie County": "area_StLucie",
  "Orange County": "area_Orange",
  "Seminole County": "area_Seminole",
  "Pinellas County (St Pete)": "area_Pinellas",
  "Hillsborough County (Tampa)": "area_Hillsborough",
  "Osceola County": "area_Osceola",
}

/** Opciones de los desplegables. El orden es el que ya tenían las pantallas. */
export const SPECIALTIES = Object.keys(SPECIALITY_LABELS)
export const COVERAGE_AREAS = Object.keys(COVERAGE_AREA_LABELS)

export function useEtiquetasCatalogo() {
  const tSpec = useTranslations("specialties")
  const tArea = useTranslations("areas")

  /**
   * Traduce un valor guardado. Devuelve null si está vacío, para que
   * `ReadonlyField` pinte su "—".
   *
   * Acepta MULTIVALOR separado por ", ": en Podio tanto «Specilty» como
   * «Coverage Area» son categorías múltiples, así que un supplier puede tener
   * "Doors, Windows/Glazing". Traducir el string entero daría una sola clave
   * inventada; se traduce cada tramo y se vuelve a unir.
   *
   * Ante lo desconocido devuelve el VALOR CRUDO, nunca la clave: un valor
   * fuera del catálogo (el desplegable permite escribir uno a mano) o una
   * clave sin traducir se ven legibles en vez de como `spec_Loquesea`.
   */
  const etiqueta = (prefijo: "spec_" | "area_", valor?: string | null): string | null => {
    if (!valor) return null
    const [t, mapa] =
      prefijo === "spec_" ? [tSpec, SPECIALITY_LABELS] : [tArea, COVERAGE_AREA_LABELS]

    const partes = valor
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => {
        const clave = (mapa as Record<string, string>)[v]
        if (!clave) return v
        const etq = (t as (k: string) => string)(clave)
        return etq === clave ? v : etq
      })

    return partes.join(", ") || null
  }

  return { etiqueta }
}
