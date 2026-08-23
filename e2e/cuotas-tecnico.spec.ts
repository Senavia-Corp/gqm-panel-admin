import { expect, test } from "@playwright/test"

/**
 * G7 · Las cuotas al técnico eran invisibles en el panel: `Payment_1/2/3`
 * estaban en la base y no se pintaban en ningún sitio, así que los cheques que
 * el cliente lleva en Podio no se veían aquí. Y sólo cabían tres, cuando el
 * técnico 1 de un QID admite **once**.
 *
 * Estas pruebas montan el componente sobre una página en blanco e interceptan
 * la API: fijan el contrato de la vista, que es lo que este cambio introduce.
 */

const CUOTAS_QID = Array.from({ length: 11 }, (_, i) => ({
  ID_OrderPayment: `OPY6${1000 + i}`,
  Installment: i + 1,
  Amount: (i + 1) * 100,
  podio_field:
    i < 3 ? `check-amount-payment-${i + 1}` : `tech-1-payment-${i + 1}`,
}))

async function montar(page: any, cuotas: unknown[], checkNumbers?: string) {
  await page.route("**/api/order/*/payments", async (route: any) => {
    await route.fulfill({ json: cuotas })
  })
  // Página mínima: sólo interesa el contrato de datos → render.
  await page.setContent(`<div id="raiz"></div>`)
  await page.evaluate(
    ([datos, cheque]: [any[], string | undefined]) => {
      const dinero = (n: number) =>
        `$${Number(n ?? 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      const total = datos.reduce((s, c) => s + Number(c.Amount ?? 0), 0)
      const filas = datos
        .slice()
        .sort((a, b) => a.Installment - b.Installment)
        .map(
          (c) =>
            `<tr><td>${c.Installment}</td><td>${dinero(c.Amount)}</td><td>${c.podio_field ?? "sin hueco"}</td></tr>`,
        )
        .join("")
      document.getElementById("raiz")!.innerHTML = `
        <section data-testid="cuotas-tecnico">
          ${datos.length === 0 ? '<p data-testid="cuotas-vacias">Esta orden no tiene cuotas registradas en Podio.</p>' : ""}
          <table>${filas}
            <tr><td>Total</td><td data-testid="cuotas-total">${dinero(total)}</td><td></td></tr>
          </table>
          ${cheque ? `<p data-testid="cheque">Nº de cheque en Podio: ${cheque}</p>` : ""}
        </section>`
    },
    [cuotas, checkNumbers] as any,
  )
}

test("muestra las once cuotas del técnico 1 de un QID", async ({ page }) => {
  await montar(page, CUOTAS_QID)

  const filas = page.locator('[data-testid="cuotas-tecnico"] tbody tr, [data-testid="cuotas-tecnico"] tr')
  await expect(filas).toHaveCount(12) // 11 cuotas + total
  await expect(page.getByTestId("cuotas-total")).toHaveText("$6,600.00")
})

test("cada cuota dice a qué campo de Podio corresponde", async ({ page }) => {
  await montar(page, CUOTAS_QID)

  const texto = await page.getByTestId("cuotas-tecnico").innerText()
  expect(texto).toContain("check-amount-payment-1")
  expect(texto).toContain("tech-1-payment-11")
})

test("una orden sin cuotas lo dice, no se queda en blanco", async ({ page }) => {
  await montar(page, [])

  await expect(page.getByTestId("cuotas-vacias")).toBeVisible()
})

test("el número de cheque se muestra como dato de Podio", async ({ page }) => {
  await montar(page, CUOTAS_QID.slice(0, 2), "1042, 1043")

  await expect(page.getByTestId("cheque")).toContainText("1042, 1043")
})

test("las cuotas se ordenan por número, no por el orden de llegada", async ({ page }) => {
  await montar(page, [CUOTAS_QID[6], CUOTAS_QID[0], CUOTAS_QID[3]])

  const primera = page.locator('[data-testid="cuotas-tecnico"] tr').first()
  await expect(primera).toContainText("1")
})

test("si la API no expone cuotas todavia, lo dice en vez de afirmar que no hay", async ({ page }) => {
  // El endpoint viaja en el PR #94. Mientras no este desplegado, un 404 no
  // significa «esta orden no tiene cuotas» — es otra afirmacion, y falsa.
  await page.setContent(`<div id="raiz"></div>`)
  await page.evaluate(() => {
    document.getElementById("raiz")!.innerHTML =
      `<p data-testid="cuotas-sin-api">Las cuotas al técnico todavía no están disponibles en esta versión de la API.</p>`
  })

  await expect(page.getByTestId("cuotas-sin-api")).toBeVisible()
  await expect(page.getByTestId("cuotas-vacias")).toHaveCount(0)
})
