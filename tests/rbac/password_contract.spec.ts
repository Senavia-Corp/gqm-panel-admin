/**
 * O-06 bis · El espejo tiene que seguir siendo un espejo.
 *
 * `lib/password-policy.ts` reproduce `src/utils/password_policy.py` del API.
 * Dos implementaciones de la misma regla se separan sin que nadie lo note, y
 * ya pasó dos veces en este mismo diff:
 *
 *  · `"🙂".length` es 2 en JavaScript y 1 en Python, así que `'Ab1🙂🙂🙂🙂'`
 *    medía 7 para el servidor y 11 para el panel: el panel la aceptaba y el
 *    API respondía 400.
 *  · el espejo comprobaba las clases ANTES que la lista de prohibidas, así que
 *    daba un motivo distinto al del servidor en 11 de 50 casos.
 *
 * Este fichero congela el veredicto Y EL MOTIVO del servidor para 51 entradas
 * —vacías, límites de longitud, cada entrada de la lista de prohibidas, emoji,
 * `ñ`, un solo carácter repetido— y exige que el espejo los reproduzca.
 *
 * LÍMITE DECLARADO: la tabla es una copia. Su gemela vive en el API, en
 * `tests/unit/test_espejo_password.py`, y afirma lo mismo contra Python. Si
 * alguien cambia la política del servidor, ESA se pone roja; si alguien toca
 * el espejo, esta. Lo que ninguna de las dos ve por sí sola es que las dos
 * tablas se separen entre ellas: por eso las dos llevan el mismo comentario y
 * el mismo corpus, y cambiarlas es un solo commit.
 */
import { expect, test } from "@playwright/test"

import { passwordValida, reglaIncumplida } from "@/lib/password-policy"

/** [contraseña, ¿la acepta el servidor?, clave de la primera regla que falla] */
const CONTRATO: Array<[string, boolean, string | null]> = [
["", false, "vacia"],
[" ", false, "vacia"],
["a", false, "longitud"],
["1", false, "longitud"],
["abc", false, "longitud"],
["password", false, "longitud"],
["PASSWORD", false, "longitud"],
["12345678", false, "longitud"],
["Abcdefg1", false, "longitud"],
["Abcdefgh1", false, "longitud"],
["Abcdefghi1", true, null],
["abcdefghij", false, "clases"],
["abcdefghij1", false, "clases"],
["ABCDEFGHIJ1", false, "clases"],
["aaaaaaaaaaaa", false, "repetida"],
["AAAAAAAAAA", false, "repetida"],
["!!!!!!!!!!", false, "repetida"],
["Cl4ve-Buena!2026", true, null],
["contraseña1A", true, null],
["Contraseña!1", true, null],
["ñññññññññññ", false, "repetida"],
["Ab1🙂🙂🙂🙂", false, "longitud"],
["🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂", false, "repetida"],
["Ab1!🙂🙂🙂🙂🙂🙂", true, null],
["Ab1!456789", true, null],
["ab1!456789", true, null],
["AB1!456789", true, null],
["Abcdefghij", false, "clases"],
["Abcdefghi!", true, null],
["abcdefghi1", false, "clases"],
["  Abcdefghi1  ", true, null],
["Password1!", true, null],
["welcome1", false, "longitud"],
["Welcome1", false, "longitud"],
["changeme", false, "longitud"],
["CHANGEME", false, "longitud"],
["senavia1", false, "longitud"],
["SENAVIA1", false, "longitud"],
["gqm12345", false, "longitud"],
["admin123", false, "longitud"],
["letmein1", false, "longitud"],
["iloveyou", false, "longitud"],
["subcontractor", false, "comun"],
["SUBCONTRACTOR", false, "comun"],
["qwertyui", false, "longitud"],
["abcd1234", false, "longitud"],
["password123", false, "comun"],
["1234567890", false, "comun"],
["123456789", false, "longitud"],
["Ab1!", false, "longitud"],
["Ab1!5678901234567890", true, null],
]

test("el espejo del panel reproduce el veredicto del servidor", () => {
  const divergencias: string[] = []
  for (const [password, valida, motivo] of CONTRATO) {
    const r = reglaIncumplida(password)
    const mio = { valida: passwordValida(password), motivo: r ? r.clave : null }
    if (mio.valida !== valida || mio.motivo !== motivo) {
      divergencias.push(
        `${JSON.stringify(password)}: servidor {valida:${valida}, motivo:${motivo}} ` +
          `· panel {valida:${mio.valida}, motivo:${mio.motivo}}`,
      )
    }
  }
  // Se ENUMERAN las divergencias, no se cuentan: con «0 == 0» un fallo
  // compensado por otro pasaría desapercibido.
  expect(divergencias).toEqual([])
})

test("el contrato cubre de verdad los casos que importan", () => {
  // Sin esto, alguien podría vaciar la tabla y la prueba de arriba seguiría
  // verde: una tabla sin filas no tiene divergencias.
  expect(CONTRATO.length).toBeGreaterThanOrEqual(50)
  const motivos = new Set(CONTRATO.map(([, , m]) => m))
  expect([...motivos].sort()).toEqual(
    ["clases", "comun", "longitud", "repetida", "vacia", null].sort(),
  )
  // Y que haya al menos una que el servidor ACEPTA: una tabla de puros
  // rechazos pasaría con un espejo que rechazara todo.
  expect(CONTRATO.filter(([, v]) => v).length).toBeGreaterThan(0)
})
