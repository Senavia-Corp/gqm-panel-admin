"use client"

import { useCallback, useState } from "react"
import type { JobFilters, JobType } from "@/lib/types"

type YearFilter = "ALL" | "2026" | "2025" | "2024" | "2023"
type JobsTab    = "ALL" | JobType

export interface JobFiltersState {
  tab:           JobsTab
  year:          YearFilter
  // Search: separamos input del usuario del valor enviado al backend
  searchInput:   string
  appliedSearch: string
  // Filtros avanzados
  status:        string
  clientId:      string
  parentMgmtCoId: string
  dateFrom:      string
  dateTo:        string
  memberId:      string
  // Paginación
  page:          number
}

const INITIAL_STATE: JobFiltersState = {
  tab:            "ALL",
  year:           "ALL",
  searchInput:    "",
  appliedSearch:  "",
  status:         "",
  clientId:       "",
  parentMgmtCoId: "",
  dateFrom:       "",
  dateTo:         "",
  memberId:       "",
  page:           1,
}

export function useJobFilters() {
  const [state, setState] = useState<JobFiltersState>(INITIAL_STATE)

  // Helper interno: cambia algo y resetea la página
  const update = useCallback((patch: Partial<JobFiltersState>) => {
    setState((prev) => ({ ...prev, ...patch, page: 1 }))
  }, [])

  // --- Handlers expuestos ---

  const setTab = useCallback((tab: JobsTab) => {
    update({ tab })
  }, [update])

  const setYear = useCallback((year: YearFilter) => {
    update({ year })
  }, [update])

  const setSearchInput = useCallback((searchInput: string) => {
    // Solo cambia el input; NO resetea la página ni lanza fetch
    setState((prev) => ({ ...prev, searchInput }))
  }, [])

  const submitSearch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      appliedSearch: prev.searchInput,
      page: 1,
    }))
  }, [])

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") { e.preventDefault(); submitSearch() }
    },
    [submitSearch]
  )

  const setStatus = useCallback((status: string) => {
    update({ status: status === "all" ? "" : status })
  }, [update])

  const setClientId = useCallback((clientId: string) => {
    update({ clientId: clientId === "all" ? "" : clientId })
  }, [update])

  const setParentMgmtCoId = useCallback((parentMgmtCoId: string) => {
    update({ parentMgmtCoId: parentMgmtCoId === "all" ? "" : parentMgmtCoId })
  }, [update])

  const setDateFrom = useCallback((dateFrom: string) => {
    update({ dateFrom })
  }, [update])

  const setDateTo = useCallback((dateTo: string) => {
    update({ dateTo })
  }, [update])

  const setMemberId = useCallback((memberId: string) => {
    update({ memberId: memberId === "all" ? "" : memberId })
  }, [update])

  const setPage = useCallback((page: number) => {
    // Cambio de página NO resetea filtros
    setState((prev) => ({ ...prev, page }))
  }, [])

  const resetFilters = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  // --- Objeto de filtros listo para fetchJobs ---
  const toServiceFilters = useCallback((): JobFilters => {
    const f: JobFilters = {}
    if (state.tab !== "ALL")          f.type            = state.tab as JobType
    if (state.year !== "ALL")         f.year            = state.year
    if (state.appliedSearch.trim())   f.search          = state.appliedSearch.trim()
    if (state.status)                 f.status          = state.status
    if (state.clientId)               f.clientId        = state.clientId
    if (state.parentMgmtCoId)         f.parentMgmtCoId  = state.parentMgmtCoId
    if (state.memberId)               f.memberId        = state.memberId
    if (state.dateFrom)               f.dateFrom        = state.dateFrom
    if (state.dateTo)                 f.dateTo          = state.dateTo
    return f
  }, [state])

  const activeFilterCount = [
    state.status,
    state.clientId,
    state.parentMgmtCoId,
    state.dateFrom || state.dateTo,
    state.appliedSearch,
    state.memberId,
  ].filter(Boolean).length

  return {
    state,
    handlers: {
      setTab,
      setYear,
      setSearchInput,
      submitSearch,
      handleSearchKeyDown,
      setStatus,
      setClientId,
      setParentMgmtCoId,
      setDateFrom,
      setDateTo,
      setMemberId,
      setPage,
      resetFilters,
    },
    toServiceFilters,
    activeFilterCount,
  }
}