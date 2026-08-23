/**
 * Traduce los códigos de error de la API a mensajes accionables.
 *
 * El backend emite códigos estables (`{"detail": ..., "code": ...}`), pero el
 * panel **nunca leía `.code`**: mostraba el `detail` crudo, que está en español
 * mientras la interfaz va con `next-intl`. Y cuando el backend devolvía un 500
 * genérico, el usuario veía «error inesperado» sin saber qué hacer.
 *
 * El caso que más dolía: crear una segunda orden para el mismo hueco de técnico
 * salía como `500 {"code":"internal_error"}`, y el mensaje real —«el técnico ya
 * tiene una orden, edita la existente»— no llegaba nunca.
 */

export type RespuestaError = {
  code?: string
  detail?: string
  error?: string
}

/** Código → clave de i18n bajo `errores.*`. */
const CLAVES: Record<string, string> = {
  // Órdenes
  order_slot_taken: "ordenHuecoOcupado",
  subcontractor_not_linked: "subcontratistaNoVinculado",
  subcontractor_required: "subcontratistaRequerido",
  subcontractor_not_found: "subcontratistaNoEncontrado",
  subcontractor_sin_podio: "subcontratistaSinPodio",
  no_available_order_slot: "sinHuecoDeOrden",
  invalid_formula_zero: "formulaCero",
  order_has_change_orders: "ordenConChangeOrders",

  // Costes
  no_available_slot: "sinHueco",
  cost_type_no_valido_para_el_tipo: "tipoDeCosteNoValido",

  // Change orders
  par_change_orders_unsupported: "parSinChangeOrders",

  // Sincronización
  podio_sync_failed: "podioNoSincronizo",
  missing_year: "faltaAnio",
  missing_job_podio_id: "faltaJobPodioId",
  job_not_found: "jobNoEncontrado",
}

/**
 * Respaldos en español para cuando la clave de i18n no exista todavía. Son el
 * mensaje que el usuario debe leer, no una etiqueta técnica.
 */
const RESPALDOS: Record<string, string> = {
  order_slot_taken:
    "Ese técnico ya tiene una orden en este job. Edita la existente en lugar de crear otra.",
  subcontractor_not_linked:
    "El subcontratista no está vinculado a este job en Podio. Enlázalo antes de crear su orden.",
  subcontractor_sin_podio:
    "Ese subcontratista no está sincronizado con Podio, así que no se le puede asignar una orden.",
  no_available_order_slot:
    "No quedan huecos de change order en Podio para este job.",
  no_available_slot:
    "No queda hueco en Podio para otro coste de este tipo. Libera uno desaprobando o borrando otro.",
  cost_type_no_valido_para_el_tipo:
    "Este tipo de job no admite ese concepto de coste: no tiene destino en Podio.",
  par_change_orders_unsupported:
    "Los jobs PAR no admiten change orders: usan pagos parciales.",
  invalid_formula_zero:
    "No se puede crear una orden con fórmula 0 ni sin costes asociados.",
  podio_sync_failed:
    "El cambio se guardó, pero Podio no lo aceptó. Queda registrado para reconciliar.",
  faltaAnio: "Falta el año de la app de Podio.",
}

/**
 * Mensaje para el usuario a partir de la respuesta de error de la API.
 *
 * @param t   `useTranslations("errores")`, si está disponible.
 * @param por defecto se usa `detail` — que sigue siendo mejor que «error inesperado».
 */
export function mensajeDeError(
  cuerpo: RespuestaError | null | undefined,
  t?: (clave: string) => string,
  respaldo = "No se pudo completar la operación.",
): string {
  if (!cuerpo) return respaldo

  const codigo = cuerpo.code
  if (codigo) {
    const clave = CLAVES[codigo]
    if (clave && t) {
      const traducido = t(clave)
      // `next-intl` devuelve la clave cuando no la encuentra.
      if (traducido && !traducido.endsWith(clave)) return traducido
    }
    if (RESPALDOS[codigo]) return RESPALDOS[codigo]
  }

  return cuerpo.detail || cuerpo.error || respaldo
}

/** ¿Es un error que el usuario puede resolver por sí mismo? */
export function esAccionable(cuerpo: RespuestaError | null | undefined): boolean {
  return Boolean(cuerpo?.code && cuerpo.code in RESPALDOS)
}
