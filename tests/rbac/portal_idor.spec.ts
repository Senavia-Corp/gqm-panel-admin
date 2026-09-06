import { expect, test } from "@playwright/test"

import { ids, stateFile } from "./helpers"

/**
 * Regresiones de la auditoría de portal (sep-2026).
 *
 * Los 30 tests del PR #49 cubren navegación negativa: qué enlaces NO se pintan y
 * a dónde rebota una URL prohibida. Ninguno toca `/api/*`, y ahí está el
 * problema: `middleware.ts:31-45` devuelve en la rama `/api/` ANTES de toda
 * lógica de rol, así que ni `FULL_ADMIN_ONLY` ni `PORTAL_PREFIXES` protegen el
 * BFF. Lo que decide es la API de Python.
 *
 * Se usa `page.request`, que comparte el tarro de cookies del contexto y evita
 * el wrapper `apiFetch` del cliente: es exactamente lo que puede hacer un
 * usuario legítimo desde la consola de su navegador.
 *
 * Estos tests afirman el comportamiento CORRECTO, así que hoy FALLAN: son la
 * prueba de que los hallazgos siguen abiertos, y pasan al arreglarlos.
 */
test.describe("portal · aislamiento entre pares", () => {
  test.use({ storageState: stateFile("subcontractor") })

  test("P-01: la ficha de un técnico ajeno no debe ser legible", async ({ page }) => {
    await page.goto("/profile")
    const res = await page.request.get(`/api/backend/technician/${process.env.RBAC_TEC_B_ID}`)
    expect(res.status(), "un técnico de otro sub debe responder 404").toBe(404)
  })

  test("P-01/F-01: no debe entregarse el documento de política IAM de nadie", async ({ page }) => {
    await page.goto("/profile")
    const res = await page.request.get(`/api/backend/technician/${process.env.RBAC_TEC_B_ID}`)
    const cuerpo = await res.text()
    expect(cuerpo, "permissions[].Document es el mapa de lo que ese usuario puede hacer")
      .not.toContain("\"Document\"")
  })

  test("P-05: la ficha de otro subcontratista no debe ser legible por API", async ({ page }) => {
    await page.goto("/profile")
    const res = await page.request.get(`/api/backend/subcontractors/${ids.subB()}`)
    expect(res.status()).toBe(404)
  })

  test("U-03: la ficha de otro subcontratista no debe cargar por URL directa", async ({ page }) => {
    await page.goto(`/subcontractors/${ids.subB()}`)
    await page.waitForLoadState("networkidle").catch(() => {})
    // middleware.ts:96 compara el prefijo /subcontractors SIN mirar el id, y la
    // única guarda de pertenencia de la página está escrita para
    // LEAD_TECHNICIAN — un rol que no existe en el backend.
    expect(page.url(), "no debe quedarse en la ficha ajena").not.toContain(ids.subB())
  })

  test("P-04: el timeline de un job ajeno no debe ser legible", async ({ page }) => {
    await page.goto("/profile")
    const res = await page.request.get(`/api/backend/tlactivity/job/${ids.jobB()}`)
    const cuerpo = await res.text()
    expect(cuerpo, "no debe traer datos del job ajeno").not.toContain(ids.jobB())
  })

  test("P-03: los adjuntos deben acotarse al ámbito propio", async ({ page }) => {
    await page.goto("/profile")
    const res = await page.request.get("/api/backend/attachments/")
    if (res.status() === 200) {
      const cuerpo = await res.text()
      expect(cuerpo, "no debe traer adjuntos del job ajeno").not.toContain(ids.jobB())
    }
  })
})

test.describe("portal · la API es el límite de confianza, no el BFF", () => {
  test.use({ storageState: stateFile("subcontractor") })

  // Estos SÍ pasan hoy: el BFF reenvía sin comprobar el rol, pero la API deniega.
  // Se fijan como regresión para que siga siendo así.
  for (const ruta of ["/api/members?limit=200", "/api/commission", "/api/roles", "/api/permissions"]) {
    test(`un subcontratista no obtiene datos de ${ruta}`, async ({ page }) => {
      await page.goto("/profile")
      const res = await page.request.get(ruta)
      expect(res.status(), "la API debe denegar aunque el BFF reenvíe").toBe(403)
    })
  }

  test("middleware.ts:41 — el Authorization del cliente desplaza a la cookie", async ({ page }) => {
    await page.goto("/profile")
    const conCookie = await page.request.get("/api/auth/me")
    const conHeader = await page.request.get("/api/auth/me", {
      headers: { authorization: "Bearer no.es.un.jwt" },
    })
    expect(conCookie.status()).toBe(200)
    // El middleware solo rellena `authorization` si NO viene: el del cliente gana.
    // La petición falla únicamente porque el header desplazó a la sesión.
    expect(conHeader.status(), "el BFF no ata la petición a la sesión").not.toBe(200)
  })
})
