"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileText, DollarSign, Calendar, Info, CheckCircle2,
  ChevronDown, ChevronUp, BanknoteIcon, Receipt
} from "lucide-react"
import { useState, useEffect } from "react"
import { useTranslations } from "@/components/providers/LocaleProvider"
import { apiFetch } from "@/lib/apiFetch"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMoney = (v: any) => {
  const n = Number(v ?? 0)
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const fmtDate = (s: any) => {
  try {
    if (!s) return "—"
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return String(s)
    return d.toLocaleDateString("en-US", { timeZone: "UTC" })
  } catch { return String(s) }
}

function parseBullets(description: string): string[] {
  if (!description) return []
  const parts = description.split(/\s*[-–]\s+/).map((s) => s.trim()).filter(Boolean)
  return parts.length <= 1 ? [description.trim()] : parts
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FinancialDocItem({ item }: { item: any }) {
  const [open, setOpen] = useState(false)
  const bullets = parseBullets(item?.Description ?? "")
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="font-medium text-sm truncate text-slate-700">{item?.Name || item?.Description?.slice(0, 40) || "Item"}</div>
          <span className="text-xs text-slate-400 flex-shrink-0">× {item?.Quantity ?? 1}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-semibold text-sm text-slate-800">{fmtMoney(Number(item?.Amount ?? item?.Unit_price ?? 0))}</span>
          {item?.Description && (
            <button onClick={() => setOpen(!open)} className="text-slate-300 hover:text-slate-500 transition-colors">
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
      {open && item?.Description && (
        <div className="px-3 pb-3 border-t border-slate-100 bg-white pt-2 space-y-1">
          {bullets.length > 1
            ? bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-slate-300" /><span>{b}</span>
              </div>
            ))
            : <p className="text-sm text-slate-500">{item.Description}</p>}
        </div>
      )}
    </div>
  )
}

function DocCard({ doc, type }: { doc: any; type: "invoice" | "bill" }) {
  const t = useTranslations("jobs")
  const isInv = type === "invoice"
  const accent = isInv
    ? { bg: "bg-emerald-50/50", icon: "bg-emerald-100", iconColor: "text-emerald-600", badge: "bg-emerald-100 border-emerald-200 text-emerald-700", balance: "text-emerald-700" }
    : { bg: "bg-orange-50/50", icon: "bg-orange-100", iconColor: "text-orange-600", badge: "bg-orange-100 border-orange-200 text-orange-700", balance: "text-orange-700" }
  const DocIcon = isInv ? FileText : DollarSign
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className={`flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-100 ${accent.bg}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`rounded-xl p-2 ${accent.icon}`}><DocIcon className={`h-4 w-4 ${accent.iconColor}`} /></div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-slate-800">{doc?.Job_Ref_QBO || "—"}</div>
            <div className="text-[10px] text-slate-400 font-mono">ID: {doc?.ID_FinancialDoc ?? "—"}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {doc?.order && (
            <div className="text-right px-3 border-r border-slate-100">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{t("pricingLinkedOrder")}</div>
              <div className="text-xs font-bold text-slate-700 truncate max-w-[140px]">
                {doc.order.Title || "Unnamed Order"}
              </div>
              <div className="flex gap-2 justify-end mt-0.5">
                <span className="text-[9px] text-slate-400 tabular-nums">F: ${Number(doc.order.Formula || 0).toFixed(2)}</span>
                <span className="text-[9px] font-bold text-slate-500 tabular-nums">A: ${Number(doc.order.Adj_formula || 0).toFixed(2)}</span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="h-3 w-3" /> {fmtDate(doc?.Due_Date)}</div>
          <div className="text-right"><div className="text-[10px] text-slate-400">Total</div><div className="text-sm font-semibold text-slate-800">{fmtMoney(Number(doc?.Total_Amount || 0))}</div></div>
          <div className="text-right"><div className="text-[10px] text-slate-400">Balance</div><div className={`text-sm font-semibold ${accent.balance}`}>{fmtMoney(Number(doc?.Balance_Amount || 0))}</div></div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${accent.badge}`}>{doc?.Percentage_Paid ?? 0}% paid</span>
        </div>
      </div>
      {doc?.Notes && (
        <div className="px-4 py-2 bg-amber-50/60 border-b border-amber-100 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700">{doc.Notes}</p>
        </div>
      )}
      {Array.isArray(doc?.financial_doc_items) && doc.financial_doc_items.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Line Items</p>
          {doc.financial_doc_items.map((item: any, idx: number) => <FinancialDocItem key={item?.ID_FDItem ?? idx} item={item} />)}
        </div>
      )}
    </div>
  )
}

function TransactionCard({ doc, type }: { doc: any; type: "invoice" | "bill" }) {
  const isInv = type === "invoice"
  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${isInv ? "border-emerald-200" : "border-orange-200"}`}>
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`rounded-xl p-2 ${isInv ? "bg-emerald-50" : "bg-orange-50"}`}>
            <BanknoteIcon className={`h-4 w-4 ${isInv ? "text-emerald-500" : "text-orange-500"}`} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-slate-800">{doc?.Reference_number || "—"}</div>
            <div className="text-[10px] text-slate-400">{doc?.Type_of_transaction || "Payment"} · {doc?.ID_FTransaction ?? "—"}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-xs text-slate-400 text-right space-y-0.5">
            <div className="flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" /> {fmtDate(doc?.Date_of_payment)}</div>
            <div>{doc?.Type_of_payment || "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Amount</div>
            <div className="text-sm font-semibold text-slate-800">{fmtMoney(Number(doc?.Total_Amount || 0))}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface LeadTechnicianPricingViewProps {
  jobId: string
  job: any
}

export function LeadTechnicianPricingView({ job }: LeadTechnicianPricingViewProps) {
  const [techSubId, setTechSubId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTechSub = async () => {
      try {
        const userData = localStorage.getItem("user_data")
        if (!userData) {
          setLoading(false)
          return
        }
        const user = JSON.parse(userData)
        const res = await apiFetch(`/api/technician/${user.id}`)
        if (res.ok) {
          const data = await res.json()
          setTechSubId(data?.subcontractor?.ID_Subcontractor ? String(data.subcontractor.ID_Subcontractor) : null)
        }
      } catch (err) {
        console.error("Failed to fetch technician subcontractor:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchTechSub()
  }, [])

  const bills = (job?.financial_docs || []).filter((d: any) => {
    const isBill = d.Type_of_document?.toLowerCase() === "bill"
    if (!isBill) return false
    if (!techSubId) return false
    
    // 1. Check if linked order belongs to tech's subcontractor
    const orderSubId = d.order?.ID_Subcontractor
    if (orderSubId && String(orderSubId) === techSubId) return true

    // 2. Fallback: check if the document itself has the subcontractor ID
    const docSubId = d.ID_Subcontractor
    if (docSubId && String(docSubId) === techSubId) return true

    return false
  })
  const billPayments = bills.flatMap((d: any) => d.financial_transactions || [])

  const billTotal = bills.reduce((s: number, d: any) => s + (Number(d?.Total_Amount) || 0), 0)
  const billTxTotal = billPayments.reduce((s: number, d: any) => s + (Number(d?.Total_Amount) || 0), 0)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
        <p className="text-sm text-slate-400 animate-pulse font-medium">Loading financial data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {/* Bills Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Bills</span>
            </div>
            <span className="text-sm text-slate-500">Total: <span className="font-bold text-slate-800">{fmtMoney(billTotal)}</span></span>
          </div>
          
          {bills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
              No bills for this job
            </div>
          ) : (
            <div className="space-y-4">
              {bills.map((bill: any) => (
                <DocCard key={bill.ID_FinancialDoc} doc={bill} type="bill" />
              ))}
            </div>
          )}
        </div>

        {/* Payments Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <BanknoteIcon className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Bill Payments</span>
            </div>
            <span className="text-sm text-slate-500">Total: <span className="font-bold text-slate-800">{fmtMoney(billTxTotal)}</span></span>
          </div>

          {billPayments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
              No bill payments yet
            </div>
          ) : (
            <div className="space-y-3">
              {billPayments.map((pay: any) => (
                <TransactionCard key={pay.ID_FTransaction} doc={pay} type="bill" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
