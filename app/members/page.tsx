"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/organisms/Sidebar"
import { TopBar } from "@/components/organisms/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus, Search, ChevronLeft, ChevronRight, Eye, Trash2,
  Users, Mail, Phone, Briefcase, Hash, AlertCircle, RefreshCw, X,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberRow = {
  ID_Member:    string
  Member_Name:  string | null
  Company_Role: string | null
  Email_Address:string | null
  Phone_Number: string | null
}

type TableResponse = {
  page:    number
  limit:   number
  total:   number
  results: MemberRow[]
}

const LIMIT = 20

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return dv
}

/** Deterministic avatar color from string */
const AVATAR_COLORS = [
  ["bg-emerald-100 text-emerald-700", "bg-emerald-600"],
  ["bg-blue-100 text-blue-700",       "bg-blue-600"   ],
  ["bg-violet-100 text-violet-700",   "bg-violet-600" ],
  ["bg-amber-100 text-amber-700",     "bg-amber-600"  ],
  ["bg-rose-100 text-rose-700",       "bg-rose-600"   ],
  ["bg-cyan-100 text-cyan-700",       "bg-cyan-600"   ],
  ["bg-indigo-100 text-indigo-700",   "bg-indigo-600" ],
  ["bg-orange-100 text-orange-700",   "bg-orange-600" ],
] as const

function avatarColor(id: string): (typeof AVATAR_COLORS)[number] {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function MemberAvatar({ name, id }: { name: string | null; id: string }) {
  const initials = (name ?? id)
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join("") || "??"
  const [, bg] = avatarColor(id)
  return (
    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${bg} text-xs font-black text-white shadow-sm`}>
      {initials}
    </div>
  )
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span className="text-xs italic text-slate-400">—</span>
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      <Briefcase className="h-2.5 w-2.5 text-slate-400" />{role}
    </span>
  )
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          <td className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-xl bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
                <div className="h-2.5 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </td>
          <td className="px-5 py-3.5"><div className="h-3 w-24 animate-pulse rounded bg-slate-200" /></td>
          <td className="px-5 py-3.5"><div className="h-3 w-32 animate-pulse rounded bg-slate-200" /></td>
          <td className="px-5 py-3.5"><div className="h-3 w-24 animate-pulse rounded bg-slate-200" /></td>
          <td className="px-5 py-3.5 text-right"><div className="ml-auto h-7 w-16 animate-pulse rounded-lg bg-slate-200" /></td>
        </tr>
      ))}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  // ── Table state ────────────────────────────────────────────────────────────
  const [rows,    setRows]    = useState<MemberRow[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // ── Search ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("")
  const debouncedSearch     = useDebounce(search, 350)

  // ── Delete dialog ──────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<MemberRow | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const u = localStorage.getItem("user_data")
    if (!u) { router.push("/login"); return }
    setUser(JSON.parse(u))
  }, [router])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (p: number, q: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true); setError(null)
    try {
      const url = new URL("/api/members/table", window.location.origin)
      url.searchParams.set("page",  String(p))
      url.searchParams.set("limit", String(LIMIT))
      if (q) url.searchParams.set("q", q)

      const res = await fetch(url.toString(), { signal: ctrl.signal, cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data: TableResponse = await res.json()

      setRows(data.results ?? [])
      setTotal(data.total   ?? 0)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setError(e?.message ?? "Failed to load members")
    } finally {
      setLoading(false)
    }
  }, [])

  // Reset page when search changes
  useEffect(() => { setPage(1) }, [debouncedSearch])

  useEffect(() => {
    if (user) fetchData(page, debouncedSearch)
  }, [user, page, debouncedSearch, fetchData])

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/members/${deleteTarget.ID_Member}`, { method: "DELETE", cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setDeleteTarget(null)
      fetchData(page, debouncedSearch)
    } catch (e: any) {
      console.error("Delete error:", e)
    } finally {
      setDeleting(false) }
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(total / LIMIT))
  const rangeStart  = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const rangeEnd    = Math.min(page * LIMIT, total)

  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">

            {/* ── Page header ─────────────────────────────────────────── */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 leading-none">GQM Members</h1>
                  <p className="mt-1 text-sm text-slate-500">Manage all GQM members and their information</p>
                </div>
              </div>
              <Button
                onClick={() => router.push("/members/create")}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" /> Add Member
              </Button>
            </div>

            {/* ── Table card ──────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-slate-800">All Members</h2>
                  {total > 0 && (
                    <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-bold text-white">
                      {total}
                    </span>
                  )}
                </div>
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Global search: name, role, email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400/30 transition-colors"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Error state */}
              {error && (
                <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-5 py-3">
                  <div className="flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fetchData(page, debouncedSearch)}
                    className="gap-1.5 border-red-200 text-xs text-red-600 hover:bg-red-100">
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </Button>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      {[
                        { icon: Users,    label: "Member"         },
                        { icon: Briefcase,label: "Role"           },
                        { icon: Mail,     label: "Email"          },
                        { icon: Phone,    label: "Phone"          },
                        { icon: null,     label: ""               },
                      ].map(({ icon: Icon, label }, i) => (
                        <th key={i} className={`px-5 py-3 text-left ${i === 4 ? "text-right" : ""}`}>
                          {label && (
                            <div className="flex items-center gap-1.5">
                              {Icon && <Icon className="h-3 w-3 text-slate-400" />}
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonRows />
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Users className="h-8 w-8 text-slate-300" />
                            <p className="text-sm text-slate-500">
                              {search ? `No members found for "${search}"` : "No members yet"}
                            </p>
                            {search && (
                              <button onClick={() => setSearch("")}
                                className="text-xs font-medium text-emerald-600 hover:underline">
                                Clear search
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : rows.map((member) => (
                      <tr key={member.ID_Member}
                        className="border-b border-slate-100 transition-colors hover:bg-slate-50/60">

                        {/* Name + ID */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <MemberAvatar name={member.Member_Name} id={member.ID_Member} />
                            <div>
                              <p className="text-sm font-semibold text-slate-800 leading-none">
                                {member.Member_Name ?? <span className="italic text-slate-400">Unnamed</span>}
                              </p>
                              <p className="mt-1 font-mono text-[11px] text-slate-400">{member.ID_Member}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-3.5">
                          <RoleBadge role={member.Company_Role} />
                        </td>

                        {/* Email */}
                        <td className="px-5 py-3.5">
                          {member.Email_Address
                            ? <a href={`mailto:${member.Email_Address}`}
                                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 hover:underline transition-colors">
                                <Mail className="h-3 w-3 flex-shrink-0 text-slate-400" />
                                {member.Email_Address}
                              </a>
                            : <span className="text-xs italic text-slate-400">—</span>
                          }
                        </td>

                        {/* Phone */}
                        <td className="px-5 py-3.5">
                          {member.Phone_Number
                            ? <a href={`tel:${member.Phone_Number}`}
                                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 hover:underline transition-colors">
                                <Phone className="h-3 w-3 flex-shrink-0 text-slate-400" />
                                {member.Phone_Number}
                              </a>
                            : <span className="text-xs italic text-slate-400">—</span>
                          }
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => router.push(`/members/${member.ID_Member}`)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white transition-colors hover:bg-amber-600"
                              title="View member"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(member)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white transition-colors hover:bg-slate-900"
                              title="Delete member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              {!loading && !error && total > 0 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
                  <p className="text-xs text-slate-500">
                    {rangeStart}–{rangeEnd} of <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> members
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm"
                      className="h-7 gap-1 text-xs border-slate-200"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || loading}>
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {page} / {totalPages}
                    </span>
                    <Button variant="outline" size="sm"
                      className="h-7 gap-1 text-xs border-slate-200"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || loading}>
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Delete dialog ─────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Delete Member</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-700">{deleteTarget?.Member_Name ?? deleteTarget?.ID_Member}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-xs" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="gap-1.5 bg-red-600 hover:bg-red-700 text-xs"
            >
              {deleting ? "Deleting…" : "Delete Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}