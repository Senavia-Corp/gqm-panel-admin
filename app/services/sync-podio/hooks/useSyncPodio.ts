import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { SyncPodioService } from "../sync-podio.service"

const syncPodioService = new SyncPodioService()

export const useFailedSyncsCount = () => {
  return useQuery({
    queryKey: ["failedSyncsCount"],
    queryFn: () => syncPodioService.getFailedSyncsCount(),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })
}

export const useFailedSyncs = () => {
  return useQuery({
    queryKey: ["failedSyncs"],
    queryFn: () => syncPodioService.getFailedSyncs(),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })
}

/** El censo pega a Podio (12 peticiones): no se refresca solo, se pide. */
export const useParidad = (enabled: boolean) => {
  return useQuery({
    queryKey: ["paridadPodio"],
    queryFn: () => syncPodioService.getParidad(),
    enabled,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export const useResyncFailedSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return syncPodioService.resyncFailedSync(id)
    },
    // `onSettled`, no `onSuccess`: el resync de una fila con varios ficheros es
    // idempotente y va fichero a fichero, asi que un 502 significa recuperacion
    // PARCIAL, no nula. Invalidando solo en exito, esos ficheros ya recuperados
    // seguian contando como pendientes hasta reabrir el modal.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["failedSyncs"] })
      queryClient.invalidateQueries({ queryKey: ["failedSyncsCount"] })
    },
  })
}

export const useResolverFailedSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, nota }: { id: number; nota?: string }) => {
      return syncPodioService.resolverFailedSync(id, nota)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["failedSyncs"] })
      queryClient.invalidateQueries({ queryKey: ["failedSyncsCount"] })
    },
  })
}

export const useDeleteFailedSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return syncPodioService.deleteFailedSync(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["failedSyncs"] })
      queryClient.invalidateQueries({ queryKey: ["failedSyncsCount"] })
    },
  })
}