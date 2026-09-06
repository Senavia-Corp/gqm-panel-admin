import { expect, test } from "@playwright/test"

import { sidebarLink, stateFile } from "./helpers"

/**
 * U-05 · El menú promete lo que el middleware niega.
 *
 * `Sidebar.tsx:66-75` pinta `/dashboard` y `/jobs` a los roles de portal, y
 * `middleware.ts:19-24` no incluye ninguno de los dos en `PORTAL_PREFIXES`.
 * Resultado: 2 de los 3 enlaces del subcontratista y los 2 del técnico rebotan.
 *
 * Afirman el comportamiento correcto, así que hoy fallan.
 */
for (const rol of ["subcontractor", "technical"] as const) {
  test.describe(`${rol} · enlaces del menú`, () => {
    test.use({ storageState: stateFile(rol) })

    for (const href of ["/dashboard", "/jobs"]) {
      test(`el enlace ${href} o no se pinta, o lleva a alguna parte`, async ({ page }) => {
        await page.goto("/")
        await page.waitForLoadState("networkidle").catch(() => {})
        const enlace = sidebarLink(page, href)
        if ((await enlace.count()) === 0) return    // no pintarlo también es correcto
        await enlace.first().click()
        await page.waitForLoadState("networkidle").catch(() => {})
        expect(page.url(), `${href} está pintado pero rebota`).toContain(href)
      })
    }
  })
}

test.describe("technical · debe poder trabajar", () => {
  test.use({ storageState: stateFile("technical") })

  test("U-01: su primera pantalla no puede ser «Access Denied»", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle").catch(() => {})
    const texto = await page.locator("body").innerText()
    expect(texto, "el técnico aterriza en /subcontractors, que no tiene permiso para ver")
      .not.toContain("Access Denied")
  })
})
