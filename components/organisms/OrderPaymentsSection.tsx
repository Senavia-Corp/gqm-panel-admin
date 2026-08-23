"use client"

import { useEffect, useState } from "react"
import { Banknote } from "lucide-react"

/**
 * Cuotas pagadas al técnico de una orden.
 *
 * Hasta ahora esto **no existía en el panel**: `Payment_1/2/3` estaban en la
 * base pero no se pintaban en ningún sitio, así que los cheques que el cliente
 * lleva en Podio eran invisibles aquí. Y sólo cabían tres, cuando el técnico 1
 * de un QID admite **once**.
 *
 * Las cuotas viven ahora en `order_payment`, cada una con el hueco de Podio que
 * declara ocupar (`podio_field`) — así se ve de un vistazo a qué campo de Podio
 * corresponde cada cheque, que es justo lo que costaba reconciliar a mano.
 */

export type Cuota = {
  ID_OrderPayment: string
  Installment: number | null
  Amount: number | null
  Date?: string | null
  Check_number?: string | null
  podio_field?: string | null
}

type Props = {
  orderId: string
  /** El `Check Number(s)` de la sección en Podio: es uno por técnico, no por
   *  cuota. Se muestra tal cual y no se edita desde aquí. */
  checkNumbersDePodio?: string | null
  /** Inyectable para las pruebas. `null` = no se pudo preguntar. */
  cargar?: (orderId: string) => Promise<Cuota[] | null>
}

const dinero = (n: number | null | undefined) =>
  `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** `null` = no se pudo preguntar; `[]` = se preguntó y no hay cuotas. */
async function cargarPorDefecto(orderId: string): Promise<Cuota[] | null> {
  const r = await fetch(`/api/order/${orderId}/payments`, { credentials: "include" })
  // 404 = la API todavía no expone las cuotas (va en el PR #94). Decirlo, en vez
  // de pintar «no tiene cuotas», que es una afirmación distinta y falsa.
  if (!r.ok) return null
  const cuerpo = await r.json().catch(() => null)
  if (cuerpo == null) return null
  return Array.isArray(cuerpo) ? cuerpo : (cuerpo?.results ?? [])
}

type Estado = { fase: "cargando" } | { fase: "sin-api" } | { fase: "listo"; cuotas: Cuota[] }

export function OrderPaymentsSection({ orderId, checkNumbersDePodio, cargar }: Props) {
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" })

  useEffect(() => {
    let vivo = true
    ;(cargar ?? cargarPorDefecto)(orderId)
      .then((c) => vivo && setEstado(c === null ? { fase: "sin-api" } : { fase: "listo", cuotas: c }))
      .catch(() => vivo && setEstado({ fase: "sin-api" }))
    return () => {
      vivo = false
    }
  }, [orderId, cargar])

  if (estado.fase === "cargando") {
    return <p className="text-xs text-slate-400">Cargando cuotas…</p>
  }

  if (estado.fase === "sin-api") {
    return (
      <p className="text-xs text-slate-400" data-testid="cuotas-sin-api">
        Las cuotas al técnico todavía no están disponibles en esta versión de la API.
      </p>
    )
  }

  const cuotas = estado.cuotas

  const total = cuotas.reduce((s, c) => s + Number(c.Amount ?? 0), 0)

  return (
    <section className="space-y-3" data-testid="cuotas-tecnico">
      <header className="flex items-center gap-2">
        <Banknote className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-semibold text-slate-700">Cuotas al técnico</h3>
        {cuotas.length > 0 && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            {cuotas.length}
          </span>
        )}
      </header>

      {cuotas.length === 0 ? (
        <p className="text-xs text-slate-400" data-testid="cuotas-vacias">
          Esta orden no tiene cuotas registradas en Podio.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Cuota</th>
                <th className="px-3 py-2 text-right font-semibold">Importe</th>
                <th className="px-3 py-2 text-left font-semibold">Campo en Podio</th>
              </tr>
            </thead>
            <tbody>
              {cuotas
                .slice()
                .sort((a, b) => (a.Installment ?? 0) - (b.Installment ?? 0))
                .map((c) => (
                  <tr key={c.ID_OrderPayment} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {c.Installment ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">{dinero(c.Amount)}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                      {c.podio_field ?? "sin hueco"}
                    </td>
                  </tr>
                ))}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td className="px-3 py-2 text-slate-600">Total</td>
                <td className="px-3 py-2 text-right text-slate-800" data-testid="cuotas-total">
                  {dinero(total)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {checkNumbersDePodio && (
        <p className="text-[11px] text-slate-400">
          Nº de cheque en Podio:{" "}
          <span className="font-mono text-slate-600">{checkNumbersDePodio}</span>{" "}
          <span className="italic">(uno por técnico; se edita en Podio)</span>
        </p>
      )}
    </section>
  )
}
