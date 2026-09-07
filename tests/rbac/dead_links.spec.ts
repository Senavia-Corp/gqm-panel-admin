import { expect, test } from "@playwright/test"

import { ids, settle, sidebarLink, stateFile } from "./helpers"
import { PORTAL_PREFIXES } from "@/lib/portal-routes"

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
        // `settle` y no un `networkidle` pelado: entrar por `/` encadena una
        // redirección del middleware hasta el inicio del rol, y con la red ya
        // en reposo el router del cliente todavía no ha terminado de hidratar.
        // Medido: pulsando ahí mismo, el enlace no navega y la prueba lo
        // denuncia como «pintado pero rebota»; con el `settle` de la casa
        // —mismo que usa el resto de este fichero— navega siempre. El cuerpo de
        // esta prueba NUNCA se había ejecutado para el subcontratista, porque
        // hasta ahora `/jobs` no se le pintaba y salía por el `return` de
        // abajo: la carrera estaba latente, no es nueva.
        await settle(page)
        const enlace = sidebarLink(page, href)
        if ((await enlace.count()) === 0) return    // no pintarlo también es correcto
        await enlace.first().click()
        await settle(page)
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
      //
      // La etiqueta es «View», con mayúscula. Antes ponía «view» en minúscula
      // porque la clave `subcontractors.view` NO EXISTÍA en los ficheros de
      // traducción y `t()` devuelve la propia clave cuando no la encuentra: el
      // botón enseñaba el nombre interno de la clave. Esta prueba tenía
      // congelado ese fallo COMO expectativa. Al añadir la clave, se puso roja
      // — que es exactamente lo que tenía que hacer.
      expect(botones.filter((b) => /^(view|Delete)$/i.test(b)).sort()).toEqual(["Delete", "View"])
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

    // Se comprueba EL TEXTO, no que exista un nodo.
    //
    // La primera versión afirmaba `expect(locator).toBeVisible()` sobre
    // `[data-sonner-toast]`: presencia, no contenido. Probado por mutación —
    // haciendo que `textoPlano` devolviera siempre `undefined`, el adaptador
    // tiraba TODO el texto del aviso, salía un bocadillo vacío y la prueba
    // seguía en verde. Un aviso en blanco es tan inútil como no tenerlo.
    const aviso = page.locator("[data-sonner-toast]").first()
    await expect(aviso).toBeVisible({ timeout: 10_000 })
    const texto = (await aviso.innerText()).replace(/\s+/g, " ").trim()
    expect(texto.length, `el aviso salió vacío: ${JSON.stringify(texto)}`).toBeGreaterThan(3)
    // Y que sea EL aviso que corresponde, no uno cualquiera: el manejador llama
    // a toast() con `profile.toasts.errMatch`, cuyo texto habla de que las
    // contraseñas no coinciden.
    expect(texto).toMatch(/match|coincid/i)
  })

  test("un aviso de error se puede cerrar y no se va antes de leerlo", async ({ page }) => {
    // La cola de radix que esto sustituye dejaba los avisos hasta que alguien
    // los cerraba; sonner los quita solos en 4 s por defecto y sin botón. Un
    // error que desaparece mientras lo lees es medio error.
    await page.goto("/profile")
    await settle(page)
    await page.getByRole("button").filter({ hasText: /Change/ }).first().click()
    const campos = page.locator('input[type="password"]')
    await expect(campos.first()).toBeVisible({ timeout: 15_000 })
    await campos.nth(0).fill("Una-Clave-Larga!2026")
    await campos.nth(1).fill("Otra-Clave-Larga!2026")
    await page.getByRole("button").filter({ hasText: /^Update$/ }).first().click()

    const aviso = page.locator("[data-sonner-toast]").first()
    await expect(aviso).toBeVisible({ timeout: 10_000 })
    await expect(aviso.locator("[data-close-button]")).toBeVisible()
    // Sigue ahí pasados los 4 s por defecto de sonner.
    await page.waitForTimeout(6_000)
    await expect(aviso).toBeVisible()
  })
})

/**
 * U-09 — enlaces DENTRO de las pantallas del portal que el middleware rebota.
 *
 * Los tests de arriba miran el menú lateral. Este mira el contenido, que es
 * donde estaban vivos: dos botones «View Job» en la ficha del subcontratista y
 * un enlace «View job» dentro del diálogo de tarea del técnico, los tres a
 * `/jobs/<id>`, ruta que no está en ningún `PORTAL_PREFIXES`.
 *
 * Medido antes del arreglo:
 *   sub    · desde ?tab=jobs → acaba en /subcontractors/SUBC60001 (y pierde la pestaña)
 *   técnico· /jobs/QID-I60001 → acaba en /dashboard, con el diálogo cerrado
 *
 * La primera prueba comprueba la REGLA, no tres botones concretos: ningún
 * `<a href>` de la pantalla puede caer fuera de los prefijos del rol, así que
 * caza también el siguiente enlace que alguien añada.
 *
 * LÍMITE DECLARADO de esa prueba: sólo ve anclas. Dos de los tres fallos que
 * la originaron eran `<button onClick={router.push(...)}>`, invisibles para
 * cualquier barrido del DOM — comprobado poniéndola contra el código
 * saboteado, donde pasó en verde. Por eso van además las pruebas concretas de
 * abajo, que sí los ven. Un barrido de anclas NO sustituye a mirar los
 * botones.
 */
// Se IMPORTA del middleware en vez de copiarse a mano. La copia local era la
// tercera de la misma tabla, y una copia desactualizada aquí no falla ruidosa:
// o denuncia como fuera de alcance una ruta recién abierta (rojo falso), o deja
// pasar una que ya no lo está (verde falso). Las dos mienten igual de bien.
const PREFIJOS_PORTAL = PORTAL_PREFIXES

/** `/login` es el enlace de «Log out»: página pública, salida legítima. */
const SALIDAS_LEGITIMAS = ["/login"]

function fueraDeAlcance(hrefs: (string | null)[], prefijos: string[]): string[] {
  return [...new Set(hrefs)]
    .filter((h): h is string => !!h)
    .filter((h) => !h.startsWith("http") && !h.startsWith("#") && !h.startsWith("mailto"))
    .filter((h) => {
      const ruta = h.split("?")[0]
      if (ruta === "/" || SALIDAS_LEGITIMAS.includes(ruta)) return false
      return !prefijos.some((p) => ruta === p || ruta.startsWith(`${p}/`))
    })
}

test.describe("portal · ningún enlace de la pantalla sale de su alcance (U-09)", () => {
  test.describe("subcontratista", () => {
    test.use({ storageState: stateFile("subcontractor") })

    test("sus pestañas no ofrecen destinos que el middleware rebota", async ({ page }) => {
      for (const tab of ["jobs", "tasks", "certificates", "timeline", "purchase-orders", "technicians"]) {
        await page.goto(`/subcontractors/${ids.sub()}?tab=${tab}`)
        await settle(page)
        const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")))
        expect(fueraDeAlcance(hrefs, PREFIJOS_PORTAL.subcontractor),
          `pestaña ${tab}`).toEqual([])
      }
    })

    test("y el botón «View Job» le lleva de verdad a su job", async ({ page }) => {
      // Esta prueba afirmaba lo contrario —que el botón NO se le ofrecía—, y
      // era correcto mientras `/jobs` no estaba entre sus prefijos: el
      // middleware lo rebotaba a su propia ficha y encima perdía la pestaña.
      // Ahora el destino existe y llega recortado, así que el callejón sin
      // salida se convierte en el camino previsto.
      await page.goto(`/subcontractors/${ids.sub()}?tab=jobs`)
      await settle(page)
      // Señal positiva antes de la negativa: la pestaña cargó con jobs dentro.
      await expect(page.getByText("AUDIT-PORTAL-A-job-de-sub-A").first()).toBeVisible({ timeout: 30_000 })
      const verJob = page.getByRole("button").filter({ hasText: /View Job|Ver Trabajo/i }).first()
      await expect(verJob).toBeVisible()
      await verJob.click()
      await expect(page).toHaveURL(new RegExp(`/jobs/${ids.job()}`), { timeout: 15_000 })
    })
  })

  test.describe("técnico", () => {
    test.use({ storageState: stateFile("technical") })

    test("el diálogo de su tarea no enlaza al job (el middleware lo rebota)", async ({ page }) => {
      await page.goto("/dashboard")
      await settle(page)
      await page.getByText(/AUDIT-PORTAL-A-tarea-de-tech-A/).first().click()
      const dlg = page.getByRole("dialog")
      await expect(dlg).toBeVisible({ timeout: 15_000 })
      // Señal positiva: el diálogo trae el job dentro, solo que sin enlace.
      // `ids.job()` y no un id escrito a mano: los ids salen de un contador
      // y cambian con cada resiembra. Medido: tras una, esta línea buscaba
      // QID-I60001 en un diálogo que decía QID-I60033.
      await expect(dlg).toContainText(ids.job())

      const hrefs = await dlg.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")))
      expect(fueraDeAlcance(hrefs, PREFIJOS_PORTAL.technical)).toEqual([])
    })
  })

  test.describe("full admin (no debe haber regresión)", () => {
    test.use({ storageState: stateFile("full_admin") })

    test("sigue viendo «View Job» en la ficha del subcontratista", async ({ page }) => {
      await page.goto(`/subcontractors/${ids.sub()}?tab=jobs`)
      await settle(page)
      await expect(page.getByRole("button").filter({ hasText: /View Job/i }).first())
        .toBeVisible({ timeout: 30_000 })
    })
  })
})
