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

export const useResyncFailedSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return syncPodioService.resyncFailedSync(id)
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