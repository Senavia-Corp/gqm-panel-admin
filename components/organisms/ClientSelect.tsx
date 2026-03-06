"use client"
import React, { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { fetchClients, fetchClientById } from "@/lib/services/clients-service"
import { Building2 } from "lucide-react"

type RawClient = any

interface Props {
  value?: string // ID_Client
  onChange: (client: { id: string; name?: string; companyName?: string; email?: any; phone?: any; address?: string; avatar?: string; status?: string } | null) => void
  initialClients?: RawClient[]
}

export function ClientSelect({ value, onChange, initialClients = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [clients, setClients] = useState<RawClient[]>(initialClients || [])
  const [selectedSingle, setSelectedSingle] = useState<RawClient | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const limit = 5

  // ref to keep the last visible selected client to avoid flicker when reloading pages
  const lastVisibleSelectedRef = useRef<RawClient | null>(null)

  useEffect(() => {
    // cargar página actual (búsqueda / paginación)
    const load = async () => {
      setLoading(true)
      try {
        const { clients: fetched, total: t } = await fetchClients(page, limit, query || undefined)
        let merged = Array.isArray(fetched) ? fetched : []
        // si el cliente seleccionado previo no está en la página, lo añadimos al inicio para evitar parpadeos
        if (value && lastVisibleSelectedRef.current) {
          const exists = merged.some((c: any) => {
            const id = c?.ID_Client ?? c?.id ?? c?.ID
            return id === (lastVisibleSelectedRef.current?.ID_Client ?? lastVisibleSelectedRef.current?.id)
          })
          if (!exists) {
            merged = [lastVisibleSelectedRef.current, ...merged]
          }
        }
        setClients(merged)
        setTotal(t || 0)
      } catch (err) {
        console.error("[ClientSelect] fetch error", err)
        setClients([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page, query, value])

  // Si value existe y no está en la página actual, traemos ese cliente por id
  useEffect(() => {
    let mounted = true
    const tryLoadSelected = async () => {
      if (!value) {
        setSelectedSingle(null)
        return
      }
      const existsInList = clients.some((c) => {
        const id = c?.ID_Client ?? c?.id ?? c?.ID
        return id === value
      })
      if (existsInList) {
        // si está en la lista, guardamos ese raw client en el ref para prevenir flicker cuando la lista se recargue
        const raw = clients.find((c) => {
          const id = c?.ID_Client ?? c?.id ?? c?.ID
          return id === value
        })
        if (raw) lastVisibleSelectedRef.current = raw
        setSelectedSingle(null)
        return
      }
      try {
        setLoading(true)
        const c = await fetchClientById(value)
        if (mounted && c) {
          setSelectedSingle(c)
          lastVisibleSelectedRef.current = c
        }
      } catch (err) {
        console.error("[ClientSelect] fetchClientById error", err)
        setSelectedSingle(null)
      } finally {
        setLoading(false)
      }
    }
    tryLoadSelected()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, clients])

  const selectedClient = (clients.find((c) => {
    const id = c?.ID_Client ?? c?.id ?? c?.ID
    return id === value
  }) ?? selectedSingle) as RawClient | undefined

  function mapToOutput(c: RawClient | null | undefined) {
    if (!c) return null
    return {
      id: c.ID_Client ?? c.id ?? c.ID,
      name: c.Prop_Manager ?? c.Client_Community ?? c.name,
      companyName: c.Parent_Company ?? c.companyName,
      email: Array.isArray(c.Email_Address) ? c.Email_Address[0] : c.Email_Address ?? c.email,
      phone: c.Phone_Number ?? c.phone,
      address: c.Address ?? c.address,
      avatar: c.avatar ?? "/placeholder.svg?height=80&width=80",
      status: c.Client_Status ?? c.status,
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left"
        onClick={() => setOpen((s) => !s)}
      >
        {selectedClient ? (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gqm-green/10 ring-1 ring-gqm-green/20 text-gqm-green-dark">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{mapToOutput(selectedClient)?.name}</div>
              <div className="text-xs text-muted-foreground">{mapToOutput(selectedClient)?.companyName}</div>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Select client</div>
        )}

        <div className="ml-auto text-xs text-muted-foreground">{selectedClient ? (selectedClient.ID_Client ?? selectedClient.id ?? "") : ""}</div>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[520px] rounded-lg border bg-white p-4 shadow-lg">
          <div className="mb-3 flex gap-2">
            <Input
              placeholder="Search clients..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
            />
            <Button onClick={() => { setQuery(""); setPage(1) }} variant="ghost">Clear</Button>
          </div>

          <div className="max-h-64 overflow-auto space-y-2">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : (clients.length === 0 && !selectedSingle) ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No clients</div>
            ) : (
              <>
                {/* Si el cliente seleccionado no está en la página actual, muéstralo al inicio */}
                {selectedSingle && (
                  <button
                    key={selectedSingle.ID_Client}
                    className="flex w-full items-start gap-3 rounded-md p-3 hover:bg-gray-50"
                    onClick={() => {
                      const mapped = mapToOutput(selectedSingle)
                      onChange(mapped)
                      setOpen(false)
                    }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gqm-green/10 ring-1 ring-gqm-green/20 text-gqm-green-dark">
                      <Building2 className="h-5 w-5" />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="font-medium">{selectedSingle.Prop_Manager ?? selectedSingle.Client_Community}</div>
                      <div className="text-xs text-muted-foreground">{selectedSingle.Parent_Company} · {selectedSingle.Client_Status ?? "—"}</div>
                      <div className="text-xs text-muted-foreground mt-1">{selectedSingle.Address}</div>
                      <div className="text-xs text-muted-foreground">{Array.isArray(selectedSingle.Email_Address) ? selectedSingle.Email_Address[0] : selectedSingle.Email_Address} · {selectedSingle.Phone_Number ?? "—"}</div>
                    </div>

                    <div className="text-xs text-muted-foreground">{selectedSingle.ID_Client}</div>
                  </button>
                )}

                {clients.map((c) => (
                  <button
                    key={c.ID_Client}
                    className="flex w-full items-start gap-3 rounded-md p-3 hover:bg-gray-50"
                    onClick={() => {
                      const mapped = mapToOutput(c)
                      onChange(mapped)
                      setOpen(false)
                    }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gqm-green/10 ring-1 ring-gqm-green/20 text-gqm-green-dark">
                      <Building2 className="h-5 w-5" />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="font-medium">{c.Prop_Manager ?? c.Client_Community}</div>
                      <div className="text-xs text-muted-foreground">{c.Parent_Company} · {c.Client_Status ?? "—"}</div>
                      <div className="text-xs text-muted-foreground mt-1">{c.Address}</div>
                      <div className="text-xs text-muted-foreground">{Array.isArray(c.Email_Address) ? c.Email_Address[0] : c.Email_Address} · {c.Phone_Number ?? "—"}</div>
                    </div>

                    <div className="text-xs text-muted-foreground">{c.ID_Client}</div>
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page} / {Math.max(1, Math.ceil(total / limit))}
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Prev
              </Button>
              <Button size="sm" onClick={() => setPage((p) => (p * limit < total ? p + 1 : p))} disabled={page * limit >= total}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}