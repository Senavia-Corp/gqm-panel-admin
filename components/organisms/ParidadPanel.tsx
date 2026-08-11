"use client"

import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { RespuestaParidad } from "@/app/services/sync-podio/sync-podio.types"

interface Props {
  data?: RespuestaParidad
  isLoading: boolean
  error: Error | null
  onRefetch: () => void
}

/**
 * Contador de Podio contra contador de la BD, una fila por app-año.
 *
 * Es la pantalla con la que el cliente comprueba la entrega sin pedirle nada a
 * nadie: abre una app en Podio, mira su número de items, y lo busca aquí.
 *
 * El aviso de "años colapsados" no es decorativo. Con `APP_ENV=test` las cuatro
 * app-años de un tipo son la MISMA app de Podio, así que la columna "Podio"
 * repite el mismo total cuatro veces mientras la BD sí se parte por año. Sin
 * decirlo, la tabla enseña un delta enorme y falso en 9 de las 12 filas.
 */
export function ParidadPanel({ data, isLoading, error, onRefetch }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-300" />
        <p className="text-sm">Counting items in Podio…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-10 w-10 text-red-500/60" />
        <p className="text-sm text-slate-600 max-w-md text-center">{error.message}</p>
        <Button variant="outline" size="sm" onClick={onRefetch}>Retry</Button>
      </div>
    )
  }

  if (!data) return null

  const colapsado = data.filas.some((f) => !f.comparable_por_anio)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data.ok ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="h-3 w-3 mr-1" /> In parity
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
              <AlertCircle className="h-3 w-3 mr-1" /> Out of parity
            </Badge>
          )}
          <span className="text-xs text-slate-500">{data.filas.length} Podio apps</span>
        </div>
        <Button variant="outline" size="sm" onClick={onRefetch}>
          <RefreshCw className="h-4 w-4 mr-2" /> Re-check
        </Button>
      </div>

      {colapsado && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <strong>This environment shares one Podio app across all years.</strong>{" "}
          The “Podio” column repeats the same total per type, so the per-year
          delta is meaningless here — compare against <em>DB (app)</em> instead.
          Per-year parity can only be proven against real credentials.
        </div>
      )}

      {data.errores.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 space-y-1">
          {data.errores.map((e) => (
            <div key={`${e.tipo}${e.anio}`}>
              <strong>{e.tipo} {e.anio}:</strong> {e.error}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">App</th>
              <th className="px-3 py-2 text-right font-medium">Podio</th>
              <th className="px-3 py-2 text-right font-medium">DB (year)</th>
              <th className="px-3 py-2 text-right font-medium">DB (app)</th>
              <th className="px-3 py-2 text-right font-medium">Delta</th>
              <th className="px-3 py-2 text-center font-medium">OK</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.filas.map((f) => (
              <tr key={`${f.tipo}${f.anio}`} className={f.ok ? "" : "bg-amber-50/40"}>
                <td className="px-3 py-2 font-mono text-xs">
                  {f.tipo} {f.anio}
                  <span className="ml-2 text-slate-400">#{f.podio.app_id}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{f.podio.filtered ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.bd.por_anio}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">{f.bd.por_app_id}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${f.delta === 0 ? "text-slate-400" : "font-medium text-amber-700"}`}>
                  {f.delta > 0 ? `+${f.delta}` : f.delta}
                </td>
                <td className="px-3 py-2 text-center">
                  {f.ok
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" />
                    : <AlertCircle className="h-4 w-4 text-amber-600 inline" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        “Podio” is the app’s own item counter. A row is in parity when it matches
        the DB count for the same app. Counting only — two records can match in
        number and still differ field by field.
      </p>
    </div>
  )
}
