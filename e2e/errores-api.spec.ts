import { expect, test } from "@playwright/test"

import { esAccionable, mensajeDeError } from "../lib/errores-api"

/**
 * G6 · El panel nunca leía `.code` de la respuesta de error: mostraba el
 * `detail` crudo del backend —en español, con la interfaz internacionalizada— o
 * «error inesperado» cuando el backend devolvía un 500 genérico.
 *
 * El caso que más dolía: crear una segunda orden para el mismo hueco de técnico
 * salía como `500 {"code":"internal_error"}` y el mensaje real nunca llegaba.
 */
test.describe("mensajes de error de la API", () => {
  test("el hueco de técnico ocupado dice qué hacer", () => {
    const mensaje = mensajeDeError({ code: "order_slot_taken", detail: "irrelevante" })

    expect(mensaje).toContain("ya tiene una orden")
    expect(mensaje).toContain("Edita la existente")
  })

  test("el código manda sobre el detail crudo del backend", () => {
    const mensaje = mensajeDeError({
      code: "no_available_slot",
      detail: "No queda hueco en Podio para otro coste de tipo BDF: la app sólo tiene 3...",
    })

    expect(mensaje).toContain("Libera uno")
  })

  test("sin código conocido se conserva el detail, que es mejor que nada", () => {
    expect(mensajeDeError({ detail: "Algo muy concreto pasó" })).toBe("Algo muy concreto pasó")
  })

  test("sin cuerpo se usa el respaldo", () => {
    expect(mensajeDeError(null, undefined, "Falló")).toBe("Falló")
  })

  test("las traducciones ganan cuando existen", () => {
    const t = (clave: string) => (clave === "ordenHuecoOcupado" ? "Slot already taken" : `errores.${clave}`)

    expect(mensajeDeError({ code: "order_slot_taken" }, t)).toBe("Slot already taken")
  })

  test("una clave sin traducir cae al respaldo en vez de mostrar la clave", () => {
    const t = (clave: string) => `errores.${clave}`

    expect(mensajeDeError({ code: "order_slot_taken" }, t)).toContain("ya tiene una orden")
  })

  test("distingue lo que el usuario puede resolver", () => {
    expect(esAccionable({ code: "order_slot_taken" })).toBe(true)
    expect(esAccionable({ code: "internal_error" })).toBe(false)
    expect(esAccionable(null)).toBe(false)
  })

  test("cubre los códigos que emiten las rutas de dinero", () => {
    const codigos = [
      "order_slot_taken",
      "subcontractor_not_linked",
      "no_available_slot",
      "cost_type_no_valido_para_el_tipo",
      "par_change_orders_unsupported",
      "invalid_formula_zero",
    ]

    for (const code of codigos) {
      const mensaje = mensajeDeError({ code })
      expect(mensaje, `falta mensaje para ${code}`).not.toBe(
        "No se pudo completar la operación.",
      )
    }
  })
})
