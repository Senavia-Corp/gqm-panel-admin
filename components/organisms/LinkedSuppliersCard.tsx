"use client"

import Link from "next/link"
import { Store, Globe, Mail, Phone, ExternalLink, Link2Off, Loader2 } from "lucide-react"
import type { SupplierEntry } from "./SupplierBrowserPanel"
import { safeUrl } from "./SupplierBrowserPanel"

interface Props {
  suppliers: SupplierEntry[]
  onUnlink: (supplierId: string) => Promise<void>
  unlinking: Set<string>
}

export function LinkedSuppliersCard({ suppliers, onUnlink, unlinking }: Props) {
  if (suppliers.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100">
            <Store className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Linked Suppliers
          </p>
          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-200 px-1.5 text-[10px] font-bold text-slate-500">
            0
          </span>
        </div>
        <div className="flex flex-col items-center gap-1.5 px-5 py-6 text-center">
          <Store className="h-7 w-7 text-slate-200" />
          <p className="text-xs text-slate-400">No suppliers linked yet</p>
          <p className="text-[11px] text-slate-300">Use the directory below to link suppliers</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100">
          <Store className="h-3.5 w-3.5 text-violet-600" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Linked Suppliers
        </p>
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-bold text-white">
          {suppliers.length}
        </span>
      </div>
      <div className="divide-y divide-slate-50">
        {suppliers.map(s => {
          const websiteUrl = safeUrl(s.Company_Website)
          const isUnlinking = unlinking.has(s.ID_Supplier)

          return (
            <div key={s.ID_Supplier} className="group px-4 py-3 space-y-1 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link href={`/suppliers/${s.ID_Supplier}`} className="hover:underline">
                    <p className="truncate text-sm font-semibold text-slate-800 hover:text-violet-700">
                      {s.Company_Name ?? s.ID_Supplier}
                    </p>
                  </Link>
                  {s.Speciality && (
                    <span className="inline-flex items-center rounded-md bg-violet-50 border border-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 mt-1">
                      {s.Speciality}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onUnlink(s.ID_Supplier)}
                  disabled={isUnlinking}
                  title="Unlink supplier"
                  className="flex-shrink-0 rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 opacity-0 group-hover:opacity-100"
                >
                  {isUnlinking
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Link2Off className="h-3.5 w-3.5" />
                  }
                </button>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {s.Email_Address && (
                  <a href={`mailto:${s.Email_Address}`}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
                    <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                    <span className="truncate max-w-[140px]">{s.Email_Address}</span>
                  </a>
                )}
                {s.Phone_Number && (
                  <a href={`tel:${s.Phone_Number}`}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700">
                    <Phone className="h-2.5 w-2.5 flex-shrink-0" />
                    {s.Phone_Number}
                  </a>
                )}
                {websiteUrl && (
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-violet-600 hover:underline">
                    <Globe className="h-2.5 w-2.5 flex-shrink-0" />
                    Website
                    <ExternalLink className="h-2 w-2 flex-shrink-0" />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
