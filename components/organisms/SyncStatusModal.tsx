"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Cloud, AlertCircle, CheckCircle2, RefreshCw,
  X, Trash2, FileWarning, FileCheck2, ShieldAlert
} from "lucide-react"
import {
  useFailedSyncs,
  useResyncFailedSync,
  useDeleteFailedSync,
  useResolverFailedSync,
  useParidad
} from "@/app/services/sync-podio/hooks/useSyncPodio"
import { ParidadPanel } from "./ParidadPanel"

interface SyncModalProps {
  open: boolean
  onClose: () => void
}

export function SyncStatusModal({ open, onClose }: SyncModalProps) {
  const { data: syncs, isLoading, refetch } = useFailedSyncs()
  const resyncMutation = useResyncFailedSync()
  const deleteMutation = useDeleteFailedSync()
  const resolverMutation = useResolverFailedSync()

  const [activeTab, setActiveTab] = useState<"unresolved" | "resolved" | "paridad">("unresolved")
  const paridad = useParidad(open && activeTab === "paridad")
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [errorMap, setErrorMap] = useState<Record<number, string>>({})
  const [confirmarBorrado, setConfirmarBorrado] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      refetch()
    }
  }, [open, refetch])

  if (!open) return null

  const unresolvedSyncs = syncs?.filter(s => !s.resolved) || []
  const resolvedSyncs = syncs?.filter(s => s.resolved) || []

  // Una fila marcada resuelta cuyo fichero NO llegó a `attachments`. En
  // producción hay 7. Contarlas aparte es lo que impide que el daño real (13)
  // siga leyéndose como 6.
  const resueltasEnFalso = resolvedSyncs.filter(
    s => s.fichero_recuperado === false)

  const displayedSyncs = activeTab === "unresolved" ? unresolvedSyncs : resolvedSyncs

  const handleResync = async (id: number) => {
    setProcessingId(id)
    setErrorMap(prev => ({ ...prev, [id]: "" }))
    try {
      await resyncMutation.mutateAsync(id)
    } catch (err: any) {
      const errorMessage = err?.data?.error || err?.message || "Unknown error"
      setErrorMap(prev => ({ ...prev, [id]: errorMessage }))
    } finally {
      setProcessingId(null)
    }
  }

  // Borrar NO estaba confirmado. Mientras el fichero siga sin estar, esta fila
  // es el ÚNICO inventario de lo que falta: un clic accidental destruía la
  // evidencia y el problema pasaba a ser invisible. Por eso el botón pide
  // confirmación y, si el fichero sigue pendiente, la pide en rojo.
  const handleDelete = async (id: number) => {
    setProcessingId(id)
    setErrorMap(prev => ({ ...prev, [id]: "" }))
    try {
      await deleteMutation.mutateAsync(id)
    } catch (err: any) {
      setErrorMap(prev => ({
        ...prev,
        [id]: err?.data?.error || err?.message || "Unknown error",
      }))
    } finally {
      setProcessingId(null)
      setConfirmarBorrado(null)
    }
  }

  // Cerrar una falla recuperada por fuera SIN destruir la evidencia. El backend
  // se niega (409) si los adjuntos siguen sin converger.
  const handleResolver = async (id: number) => {
    setProcessingId(id)
    setErrorMap(prev => ({ ...prev, [id]: "" }))
    try {
      await resolverMutation.mutateAsync({ id })
    } catch (err: any) {
      setErrorMap(prev => ({
        ...prev,
        [id]: err?.data?.error || err?.message || "Unknown error",
      }))
    } finally {
      setProcessingId(null)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isLoading ? "bg-blue-50" : unresolvedSyncs.length > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
              {isLoading ? (
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              ) : unresolvedSyncs.length > 0 ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Podio Failed Syncs</h2>
              <p className="text-xs text-slate-500">Manage synchronization errors from Podio webhooks</p>
            </div>
          </div>

          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("unresolved")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "unresolved"
                ? "border-red-600 text-red-600 bg-red-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            Unresolved
            {unresolvedSyncs.length > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200">
                {unresolvedSyncs.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab("resolved")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "resolved"
                ? "border-emerald-600 text-emerald-600 bg-emerald-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Resolved
            {resolvedSyncs.length > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                {resolvedSyncs.length}
              </Badge>
            )}
            {resueltasEnFalso.length > 0 && (
              <Badge
                className="bg-amber-100 text-amber-800 border-amber-300"
                title="Marcadas como resueltas, pero su fichero sigue sin estar en la base"
              >
                {resueltasEnFalso.length} sin fichero
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab("paridad")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "paridad"
                ? "border-blue-600 text-blue-600 bg-blue-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Cloud className="h-4 w-4" />
            Parity
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50">
          {activeTab === "paridad" ? (
            <ParidadPanel
              data={paridad.data}
              isLoading={paridad.isFetching}
              error={paridad.error as Error | null}
              onRefetch={() => paridad.refetch()}
            />
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 text-slate-300 animate-spin" />
            </div>
          ) : displayedSyncs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              {activeTab === "unresolved" ? (
                <>
                  <CheckCircle2 className="h-12 w-12 mb-2 text-emerald-500/50" />
                  <p>All sync errors have been resolved!</p>
                </>
              ) : (
                <>
                  <Cloud className="h-12 w-12 mb-2 text-slate-300" />
                  <p>No resolved syncs found.</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === "resolved" && resueltasEnFalso.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-300 bg-amber-50">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <strong>
                      {resueltasEnFalso.length} de estas {resolvedSyncs.length} figuran
                      resueltas y su fichero sigue sin estar.
                    </strong>{" "}
                    Se cerraron con un «Resync exitoso» que no llegó a recuperar
                    nada. Cuentan como pérdidas, no como arregladas.
                  </div>
                </div>
              )}
              {displayedSyncs.map((sync) => (
                <div
                  key={sync.id}
                  className={`p-4 rounded-xl border bg-white shadow-sm ${
                    !sync.resolved ? "border-red-200" : "border-emerald-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs bg-slate-100">
                          ID: {sync.id}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-mono">
                          {sync.hook_type || "Unknown hook"}
                        </Badge>
                        {sync.item_id && (
                          <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                            Item ID: {sync.item_id}
                          </Badge>
                        )}
                        {/*
                          El dato que faltaba. El modal no mencionaba los
                          adjuntos en ningún sitio, así que una fila resuelta de
                          mentira se veía idéntica a una resuelta de verdad.
                        */}
                        {sync.fichero_recuperado === true && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                            <FileCheck2 className="h-3 w-3 mr-1" />
                            Fichero en la base
                          </Badge>
                        )}
                        {sync.fichero_recuperado === false && (
                          <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                            <FileWarning className="h-3 w-3 mr-1" />
                            Fichero AUSENTE
                          </Badge>
                        )}
                        <span className="text-xs text-slate-500 ml-2">
                          {new Date(sync.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-slate-900 mb-1">Error Message:</h4>
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-100 break-words font-mono text-xs">
                          {sync.error_message || "No error message provided."}
                        </p>
                      </div>

                      {errorMap[sync.id] && (
                        <div className="mb-3">
                          <h4 className="text-sm font-semibold text-slate-900 mb-1">Resync Failed:</h4>
                          <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-100 break-words font-mono text-xs">
                            {errorMap[sync.id]}
                          </p>
                        </div>
                      )}

                      {sync.resolved && sync.fichero_recuperado === false && (
                        <div className="mb-3 flex items-start gap-2 p-2 rounded-md border border-amber-200 bg-amber-50">
                          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-900">
                            Figura resuelta, pero el fichero no está en la base.
                            Esta fila es el único inventario de lo que falta:{" "}
                            <strong>no la borres.</strong>
                            {sync.file_ids_pendientes?.length ? (
                              <span className="block mt-1 font-mono">
                                Pendientes: {sync.file_ids_pendientes.join(", ")}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      )}

                      <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100 overflow-x-auto">
                        <strong>Payload Preview:</strong>
                        <pre className="mt-1 max-h-32 overflow-y-auto">
                          {JSON.stringify(sync.payload, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {/*
                        También en las que figuran resueltas y su fichero NO
                        está: el aviso de arriba las denuncia, y sin este botón
                        la única salida era Delete — que borra el inventario de
                        lo que falta. El backend solo acepta reintentar las que
                        mienten de forma medible.
                      */}
                      {(!sync.resolved || sync.fichero_recuperado === false) && (
                        <Button
                          onClick={() => handleResync(sync.id)}
                          size="sm"
                          disabled={processingId === sync.id}
                          className="bg-blue-600 hover:bg-blue-700 w-28"
                        >
                          {processingId === sync.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              {sync.resolved ? "Recuperar" : "Resync"}
                            </>
                          )}
                        </Button>
                      )}
                      {!sync.resolved && sync.fichero_recuperado === true && (
                        <Button
                          onClick={() => handleResolver(sync.id)}
                          size="sm"
                          variant="outline"
                          disabled={processingId === sync.id}
                          className="w-28 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          title="El fichero ya está en la base: cerrar la falla sin borrarla"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Cerrar
                        </Button>
                      )}

                      {confirmarBorrado === sync.id ? (
                        <div className="flex flex-col gap-1 w-28">
                          <p className="text-[11px] leading-tight text-red-700">
                            {sync.fichero_recuperado === false
                              ? "El fichero sigue perdido. Borrar elimina la única prueba."
                              : "Se borra el registro. No tiene vuelta atrás."}
                          </p>
                          <Button
                            onClick={() => handleDelete(sync.id)}
                            size="sm"
                            variant="destructive"
                            disabled={processingId === sync.id}
                          >
                            {processingId === sync.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              "Sí, borrar"
                            )}
                          </Button>
                          <Button
                            onClick={() => setConfirmarBorrado(null)}
                            size="sm"
                            variant="ghost"
                            disabled={processingId === sync.id}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setConfirmarBorrado(sync.id)}
                          size="sm"
                          variant="destructive"
                          disabled={processingId === sync.id}
                          className="w-28"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    typeof document !== "undefined" ? document.body : (null as any)
  )
}