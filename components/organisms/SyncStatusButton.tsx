"use client"

import { useEffect, useState } from "react"
import { Cloud, CloudOff } from "lucide-react"
import {
  useFailedSyncsCount,
  useFailedSyncs
} from "@/app/services/sync-podio/hooks/useSyncPodio"
import { SyncStatusModal } from "@/components/organisms/SyncStatusModal"

export function SyncStatusButton() {
  const { data: count, isLoading, refetch: refetchCount } = useFailedSyncsCount()
  const { data: filas, refetch: refetchList } = useFailedSyncs()

  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(true)

  // Refresh manual cuando window gana foco
  // useEffect(() => {
  //   setMounted(true)
  //   const handleFocus = () => {
  //     refetchCount()
  //     refetchList()
  //   }
  //   window.addEventListener("focus", handleFocus)
  //   return () => window.removeEventListener("focus", handleFocus)
  // }, [refetchCount, refetchList])

  if (!mounted) return null

  // `count` ya solo trae lo ACCIONABLE. Las irrecuperables van aparte: no son
  // una tarea pendiente (nadie puede arreglarlas pulsando nada) pero tampoco
  // estan resueltas, asi que ni suman al rojo ni desaparecen del panel.
  const totalIssues = count?.count ?? 0
  const irrecuperables = count?.irrecuperables ?? 0
  const hasIssues = totalIssues > 0

  // El contador del backend cuenta FILAS, y una fila puede arrastrar varios
  // ficheros: el 3-sep-2026 el panel decia 5 mientras faltaban 8 ficheros,
  // porque la fila 19 traia cinco `file_ids` en una sola cadena. El endpoint de
  // lista ya calcula `file_ids_pendientes` por fila, asi que sumarlos aqui no
  // cuesta ninguna peticion extra.
  //
  // `file_ids_pendientes` es `null` cuando la comprobacion no se pudo hacer y
  // `[]` en las filas que no hablan de adjuntos: por eso el numero de ficheros
  // es un SUELO, no un total, y solo se muestra si aporta algo sobre las filas.
  const ficherosPendientes = (filas ?? [])
    .filter((f) => !f.resolved)
    .reduce((n, f) => n + (f.file_ids_pendientes?.length ?? 0), 0)
  const base =
    ficherosPendientes > totalIssues
      ? `Sync Errors: ${totalIssues} (${ficherosPendientes} ficheros)`
      : `Sync Errors: ${totalIssues}`
  const etiqueta =
    irrecuperables > 0 ? `${base} · ${irrecuperables} sin arreglo` : base

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
          hasIssues
            ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
            : irrecuperables > 0
              ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
              : "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        {hasIssues ? (
          <>
            <CloudOff className="h-4 w-4" />
            <span>{etiqueta}</span>
          </>
        ) : (
          <>
            <Cloud className="h-4 w-4" />
            <span>Sync: OK</span>
          </>
        )}
      </button>
      <SyncStatusModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}