"use client"

import { useTranslations } from "@/components/providers/LocaleProvider"
import type { IAMDocument } from "@/lib/types"

/**
 * Resumen legible de un documento IAM.
 *
 * OJO: hay que separar Allow de Deny. La versión anterior aplanaba TODOS los
 * Statement y, al ver un `*`, etiquetaba «Full Administrative Access» — así
 * que `gqm-member-operativo` (Allow * + Deny iam/qbo/admin/…) aparentaba
 * acceso total justo en la pantalla de permisos. En el evaluador del API el
 * Deny SIEMPRE gana, y aquí tiene que verse igual.
 */
export function PolicySummary({ document }: { document?: IAMDocument | null }) {
  const t = useTranslations("roles_permissions")
  const statements = document?.Statement ?? []
  if (!statements.length) return <span className="text-slate-400">—</span>

  const allow = statements
    .filter((s) => (s.Effect ?? "Allow") === "Allow")
    .flatMap((s) => s.Action)
  const deny = statements
    .filter((s) => s.Effect === "Deny")
    .flatMap((s) => s.Action)

  // Agrupa por módulo conservando el detalle exacto en el tooltip
  const porModulo = (acciones: string[]) => {
    const mapa = new Map<string, string[]>()
    for (const a of acciones) {
      const modulo = a.split(":")[0]
      if (!modulo) continue
      mapa.set(modulo, [...(mapa.get(modulo) ?? []), a])
    }
    return mapa
  }

  const denyPorModulo = porModulo(deny)

  const ChipDeny = ({ modulo, acciones }: { modulo: string; acciones: string[] }) => {
    const completo = acciones.includes(`${modulo}:*`) || acciones.includes("*")
    return (
      <span
        title={acciones.join(", ")}
        className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold lowercase text-red-700"
      >
        ✕ {modulo}
        {completo ? ":*" : acciones.length > 1 ? ` (${acciones.length})` : ""}
      </span>
    )
  }

  const chipsDeny = [...denyPorModulo.entries()].map(([m, acciones]) => (
    <ChipDeny key={`deny-${m}`} modulo={m} acciones={acciones} />
  ))

  // Acceso total: solo si NO hay ningún Deny que lo recorte
  if (allow.includes("*")) {
    if (!deny.length) {
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
          {t("fullAccessLabel")}
        </span>
      )
    }
    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
          {t("fullAccessExceptLabel")}
        </span>
        {chipsDeny}
      </div>
    )
  }

  const modulosAllow = Array.from(
    new Set(allow.map((a) => a.split(":")[0]).filter(Boolean)),
  )

  return (
    <div className="flex flex-wrap gap-1">
      {modulosAllow.map((m) => {
        const completo = allow.includes(`${m}:*`)
        return (
          <span
            key={`allow-${m}`}
            title={allow.filter((a) => a.startsWith(`${m}:`)).join(", ")}
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold lowercase ${
              completo
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {m}
            {completo ? ":*" : ""}
          </span>
        )
      })}
      {chipsDeny}
    </div>
  )
}
