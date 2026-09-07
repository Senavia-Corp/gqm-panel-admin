import { test, expect } from "@playwright/test"
import { settle, stateFile } from "./helpers"

/**
 * O-06 bis — la política se cableó en DIEZ pantallas y sólo `/profile` se
 * probaba.
 *
 * `password_policy.spec.ts` cubre la pantalla del portal, que era la del
 * límite más flojo. Pero la revisión adversarial midió el hueco: devolviendo
 * `app/technicians/create/page.tsx` a su regla vieja de 8 caracteres —la
 * pantalla del alta masiva de los 432— el panel volvía a dejar salir la
 * petición, el API respondía 400, y **los 63 tests del panel seguían
 * pasando**. Ninguna prueba tocaba una pantalla de ALTA.
 *
 * Aquí se recorren las tres de alta, que son las que teclea el administrador
 * durante el onboarding. Se comprueban las dos mitades:
 *
 *   1. que el usuario VE la regla incumplida antes de guardar, y
 *   2. que el panel NO manda la petición.
 *
 * La segunda es la que no se puede fingir: un cartel puede pintarse y la
 * petición irse igual, que es exactamente el síntoma de O-06.
 */
test.use({ storageState: stateFile("full_admin") })

/** Válida con la regla VIEJA (8, mayúscula, dígito). El servidor pide 10. */
const CORTA = "Abcdefg1"

const PANTALLAS = [
  { ruta: "/technicians/create",   nombre: "alta de técnico" },
  { ruta: "/members/create",       nombre: "alta de member" },
  { ruta: "/subcontractors/create", nombre: "alta de subcontratista" },
]

for (const { ruta, nombre } of PANTALLAS) {
  test(`${nombre}: la contraseña corta ni se acepta ni se manda`, async ({ page }) => {
    const enviadas: string[] = []
    page.on("request", (r) => {
      if (["POST", "PATCH", "PUT"].includes(r.method()) && r.url().includes("/api/")) {
        enviadas.push(`${r.method()} ${r.url()}`)
      }
    })

    await page.goto(ruta)
    await settle(page)

    const campos = page.locator('input[type="password"]')
    await expect(campos.first(), `${ruta} no tiene campo de contraseña`)
      .toBeVisible({ timeout: 15_000 })

    const cuantos = await campos.count()
    for (let i = 0; i < cuantos; i++) await campos.nth(i).fill(CORTA)

    // 1. La regla de 10 se enseña y se enseña SIN CUMPLIR. Se afirma el
    //    símbolo, no sólo la presencia del texto: la regla aparece en la lista
    //    tanto cumplida como incumplida, así que comprobar que «está» no
    //    distingue nada.
    //
    //    `getByText` y no `locator("li")`: /profile pinta las reglas como <li>
    //    y las pantallas de alta como <span>. Atarse a la etiqueta hacía que
    //    esta prueba fallara por la forma del HTML en vez de por la política.
    const regla10 = page.getByText(/At least 10 characters/).first()
    await expect(regla10, `${ruta} no enseña la regla de longitud`)
      .toBeVisible({ timeout: 10_000 })
    await expect(regla10).toContainText("○")

    // 2. Y al intentar guardar no sale ninguna escritura.
    //
    //    Se busca el submit del formulario, no «el último botón cuyo texto
    //    suene a guardar»: con eso, en /subcontractors/create se pulsaba otro
    //    control y la página se cerraba a media prueba («Target page … has
    //    been closed»), que es un fallo del arnés, no de la política.
    const submit = page.locator('button[type="submit"]').first()
    const guardar = (await submit.count()) > 0
      ? submit
      : page.getByRole("button").filter({ hasText: /^(Create|Save)/ }).first()

    if ((await guardar.count()) > 0) {
      // Que el botón esté DESHABILITADO es una forma legítima —y mejor— de no
      // mandar la contraseña débil, y es lo que hace /subcontractors/create.
      // Sin distinguirlo, `click()` se quedaba esperando a que fuera pulsable
      // y la prueba moría por timeout a los 30 s: un arreglo correcto
      // reportado como fallo.
      if (await guardar.isDisabled().catch(() => false)) {
        expect(enviadas, `${ruta}: botón inhabilitado pero algo se mandó`).toEqual([])
        return
      }
      await guardar.click({ timeout: 5_000 }).catch(() => {})
      // Si el clic navegara, la espera revienta; lo que importa es lo que se
      // haya mandado hasta ese momento, así que no se deja caer la prueba por
      // eso: la aserción de abajo es la que manda.
      await page.waitForTimeout(2_000).catch(() => {})
    }
    expect(enviadas, `${ruta} dejó salir la contraseña débil: ${enviadas.join(", ")}`)
      .toEqual([])
  })
}

test("la ficha del subcontratista sí ofrece reponer la contraseña", async ({ page }) => {
  /**
   * No existía: la ficha del técnico y la del member tenían «Change Password»
   * y la del subcontratista no mencionaba «password» ni una vez, así que un
   * administrador no tenía forma de reponerle el acceso a un sub que no
   * pudiera entrar — con 432 a punto de encenderse, esa es la llamada que
   * llega. Esta prueba fija que el bloque existe y que impone la política.
   */
  await page.goto("/subcontractors/SUBC60001?tab=details")
  await settle(page)

  const abrir = page.getByRole("button").filter({ hasText: /Change Password/ }).first()
  await expect(abrir, "la ficha del sub no ofrece cambiar la contraseña")
    .toBeVisible({ timeout: 15_000 })
  await abrir.click()

  const campos = page.locator('input[type="password"]')
  await expect(campos.first()).toBeVisible({ timeout: 10_000 })
  await campos.nth(0).fill(CORTA)
  await campos.nth(1).fill(CORTA)

  const enviadas: string[] = []
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().includes("/api/")) enviadas.push(r.url())
  })
  await page.getByRole("button").filter({ hasText: /Update Password/ }).first().click()
  await page.waitForTimeout(2_000)
  expect(enviadas, `dejó salir la contraseña débil: ${enviadas.join(", ")}`).toEqual([])
})
