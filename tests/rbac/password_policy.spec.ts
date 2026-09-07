import { test, expect } from "@playwright/test"
import { settle, stateFile } from "./helpers"

/**
 * O-06 — el panel prometía una política y el servidor imponía otra.
 *
 * Ocho pantallas escribían sus propias reglas a mano: siete pedían 8
 * caracteres y `/profile` —la que usa el propio subcontratista o técnico—
 * pedía SEIS. `src/utils/password_policy.py` exige 10 y 3 de 4 tipos de
 * carácter. Medido con HTTP crudo contra `POST /technician/`:
 *
 *   'Abcdefg1'   (8)  → panel ACEPTA · servidor 400
 *   'Abcdefghi1' (10) → panel ACEPTA · servidor 201
 *
 * El administrador rellenaba el formulario con todo en verde y el alta moría
 * al final. Con 432 altas por delante, es el trabajo hecho dos veces.
 *
 * Esta prueba usa la pantalla del PORTAL a propósito: es la que tenía el
 * límite más flojo y la única que el cliente final toca sin un admin al lado.
 */
test.use({ storageState: stateFile("subcontractor") })

/** Una contraseña que la regla VIEJA daba por buena y el servidor rechaza. */
const CORTA = "Abcdefg1"

test("la pantalla de perfil exige la política del servidor, no una más floja", async ({ page }) => {
  await page.goto("/profile")
  await settle(page)

  await page.getByRole("button").filter({ hasText: /Change/ }).first().click()
  const campos = page.locator('input[type="password"]')
  await expect(campos.first()).toBeVisible({ timeout: 15_000 })
  await campos.nth(0).fill(CORTA)
  await campos.nth(1).fill(CORTA)

  // 1. El usuario VE por qué no vale, y lo ve antes de darle a guardar.
  const regla10 = page.locator("li").filter({ hasText: /At least 10 characters/ })
  await expect(regla10.first()).toBeVisible()
  await expect(regla10.first()).toContainText("○")  // sin cumplir

  // 2. Y el panel NO manda la petición: antes salía y volvía un 400 del API.
  //    Se vigila la red, no el texto de un aviso: un cartel puede pintarse y
  //    la petición irse igual.
  const patches: string[] = []
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().includes("/api/")) patches.push(r.url())
  })
  await page.getByRole("button").filter({ hasText: /^Update$/ }).first().click()
  await page.waitForTimeout(2_000)
  expect(patches, `el panel dejó salir la contraseña débil: ${patches.join(", ")}`).toEqual([])
})

test("las cuatro reglas del servidor se enseñan, no solo la longitud", async ({ page }) => {
  await page.goto("/profile")
  await settle(page)
  await page.getByRole("button").filter({ hasText: /Change/ }).first().click()
  const campos = page.locator('input[type="password"]')
  await expect(campos.first()).toBeVisible({ timeout: 15_000 })
  await campos.nth(0).fill(CORTA)

  // Se ENUMERA la lista: «hay 4 reglas» pasaría con cuatro reglas equivocadas.
  const textos = await page
    .locator("li")
    .filter({ hasText: /At least 10|3 of:|commonly used|repeated character/ })
    .allInnerTexts()
  const limpias = textos.map((t) => t.replace(/^[○✓]\s*/, "").replace(/\s+/g, " ").trim()).sort()
  expect(limpias).toEqual([
    "3 of: lowercase, uppercase, digit, symbol",
    "At least 10 characters",
    "Not a commonly used password",
    "Not a single repeated character",
  ])
})
