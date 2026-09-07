import { expect, test } from "@playwright/test"

import { ids, settle, sidebarLink, stateFile } from "./helpers"

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

/**
 * U-07 — la cola de avisos no se pintaba en ninguna parte.
 *
 * `@/components/ui/use-toast` era la implementación shadcn/radix: un store en
 * memoria que sólo se ve si alguien monta `<Toaster />` de
 * `@/components/ui/toaster`, un componente que NO EXISTE en el repositorio.
 * `app/layout.tsx` monta el de **sonner**, que escucha otro store. Los 28
 * ficheros que llamaban a `toast()` desde ahí escribían al vacío.
 *
 * Medido: un subcontratista pulsaba «Delete» en la tarjeta de un técnico, el
 * manejador ejecutaba `toast({ title: "Denied" })` y en pantalla no ocurría
 * nada — ni aviso, ni diálogo, ni petición. Un botón mudo.
 *
 * U-08 — y esos dos botones tampoco llevaban a ninguna parte:
 *  · «Delete» exige `subcontractor:update`, que el sub no tiene.
 *  · «view» empuja a /technicians/<id>, que el middleware le rebota.
 * Se le dejan de ofrecer; el admin los conserva.
 */
test.describe("portal · la tarjeta de técnico no ofrece botones muertos (U-07/U-08)", () => {
  test.describe("como subcontratista", () => {
    test.use({ storageState: stateFile("subcontractor") })

    test("no se le ofrecen «view» ni «Delete»", async ({ page }) => {
      await page.goto(`/subcontractors/${ids.sub()}?tab=technicians`)
      await settle(page)
      // Señal positiva primero: la pestaña cargó de verdad y hay una tarjeta.
      await expect(page.getByText("DEV Technician").first()).toBeVisible({ timeout: 30_000 })

      const botones = (await page.getByRole("button").allInnerTexts())
        .map((t) => t.replace(/\s+/g, " ").trim())
      expect(botones.filter((b) => /^(view|Delete)$/i.test(b))).toEqual([])
    })
  })

  test.describe("como full admin (no debe haber regresión)", () => {
    test.use({ storageState: stateFile("full_admin") })

    test("sigue viendo «view» y «Delete»", async ({ page }) => {
      await page.goto(`/subcontractors/${ids.sub()}?tab=technicians`)
      await settle(page)
      await expect(page.getByText("DEV Technician").first()).toBeVisible({ timeout: 30_000 })

      const botones = (await page.getByRole("button").allInnerTexts())
        .map((t) => t.replace(/\s+/g, " ").trim())
      // Se ENUMERA: «hay 2» pasaría con dos botones equivocados.
      expect(botones.filter((b) => /^(view|Delete)$/i.test(b)).sort()).toEqual(["Delete", "view"])
    })
  })
})

/**
 * U-07 por su lado: que la cola de avisos vuelva a pintarse.
 *
 * Se comprueba con el aviso de éxito del admin al guardar su perfil, porque es
 * un `toast()` de `use-toast` que sale de una acción real y no depende de
 * ningún permiso denegado.
 */
test.describe("los avisos de use-toast se pintan (U-07)", () => {
  test.use({ storageState: stateFile("full_admin") })

  test("un toast de use-toast llega a la pantalla", async ({ page }) => {
    await page.goto("/profile")
    await settle(page)
    await page.getByRole("button").filter({ hasText: /Change/ }).first().click()
    const campos = page.locator('input[type="password"]')
    await expect(campos.first()).toBeVisible({ timeout: 15_000 })
    // Dos contraseñas distintas → el manejador llama a toast() con la variante
    // destructive por «no coinciden», sin tocar la red ni cambiar nada.
    await campos.nth(0).fill("Una-Clave-Larga!2026")
    await campos.nth(1).fill("Otra-Clave-Larga!2026")
    await page.getByRole("button").filter({ hasText: /^Update$/ }).first().click()

    // Sonner pinta sus avisos en una región con role="status".
    await expect(page.locator('[data-sonner-toast], [role="status"]').first())
      .toBeVisible({ timeout: 10_000 })
  })
})
