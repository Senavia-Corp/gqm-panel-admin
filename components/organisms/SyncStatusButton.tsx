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
  const { refetch: refetchList } = useFailedSyncs()

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

  const totalIssues = count || 0
  const hasIssues = totalIssues > 0

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
          hasIssues
            ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
            : "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        {hasIssues ? (
          <>
            <CloudOff className="h-4 w-4" />
            <span>Sync Errors: {totalIssues}</span>
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