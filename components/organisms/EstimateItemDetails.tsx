"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "@/components/providers/LocaleProvider"
import type { EstimateItem } from "@/lib/types"
import { 
  ArrowLeft, 
  Pencil, 
  Tag, 
  Layers, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Info, 
  Hash, 
  Package, 
  Calculator,
  Percent,
  CheckCircle2,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

interface EstimateItemDetailsProps {
  item: EstimateItem
  onBack: () => void
  onEdit?: () => void
}

export function EstimateItemDetails({ item, onBack, onEdit }: EstimateItemDetailsProps) {
  const t = useTranslations("jobEstimate.itemDetails")
  
  const parseValue = (value: string | number): number => {
    if (typeof value === "number") return value
    const parsed = Number.parseFloat(String(value).replace(/[%$,]/g, ""))
    return Number.isNaN(parsed) ? 0 : parsed
  }

  const markup = parseValue(item.Markup)
  const margin = parseValue(item.Margin)
  const percentInvoiced = parseValue(item.Percent_Invoiced)

  const money = (val: number) => 
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* ── Top Navigation ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={onBack} 
          className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">{t("btnBack")}</span>
        </Button>
        
        {onEdit && (
          <Button 
            onClick={onEdit} 
            className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all hover:shadow-md gap-2"
          >
            <Pencil className="h-4 w-4" />
            {t("btnEdit")}
          </Button>
        )}
      </div>

      {/* ── Header Section ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100">
                <Package className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{item.Title}</h1>
                <div className="flex items-center gap-2 text-sm font-mono text-slate-400">
                  <Hash className="h-3.5 w-3.5" />
                  {item.ID_EstimateItem}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {item.ID_Order ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-sm">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                {t("badgeAssigned")}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                Unassigned
              </Badge>
            )}
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
              {item.Cost_Type || t("notAvailable")}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── All Cards Vertical ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        
        {/* Classification Group */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <Layers className="h-4 w-4" />
              {t("catClassTitle")}
            </h3>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("lCategory")}</p>
                <p className="text-sm font-bold text-slate-700">{item.Category}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("lCostCode")}</p>
                <p className="text-sm font-mono font-bold text-slate-700">{item.Cost_Code}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("lParentGroup")}</p>
                <p className="text-sm font-bold text-slate-700">{item.Parent_Group || t("notAvailable")}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("lLineItemType")}</p>
                <p className="text-sm font-bold text-slate-700">{item.Line_Item_Type}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description Group */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <FileText className="h-4 w-4" />
              {t("descTitle")}
            </h3>
          </div>
          <CardContent className="p-6">
            <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap italic">
              {item.Description || "No description provided."}
            </p>
          </CardContent>
        </Card>

        {/* Internal Notes (Conditional) */}
        {item.Internal_Notes && (
          <Card className="overflow-hidden border-amber-100 bg-amber-50/20 shadow-sm">
            <div className="bg-amber-50/50 border-b border-amber-100 px-6 py-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600">
                <Info className="h-4 w-4" />
                {t("notesTitle")}
              </h3>
            </div>
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed text-amber-900/80 font-medium">
                {item.Internal_Notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Financial Overview (Previously Dark, now Light) */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <Calculator className="h-4 w-4" />
              {t("breakdownTitle")}
            </h3>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {/* Primary Metrics */}
              <div className="space-y-6 md:col-span-2">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("lBuilderCost")}</p>
                    <p className="text-2xl font-black text-slate-900">{money(item.Builder_Cost)}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("lClientPrice")}</p>
                    <p className="text-2xl font-black text-emerald-600">{money(item.Client_Price)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8 pt-2">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("lMarkup")}</p>
                    <p className="text-base font-bold text-slate-600">
                      {item.Markup_Type === "%" ? `${markup}%` : money(markup)}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("lMargin")}</p>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className={cn("h-4 w-4", margin >= 0 ? "text-emerald-500" : "text-red-500")} />
                      <p className={cn("text-base font-bold", margin >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {margin.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit Highlight */}
              <div className="flex flex-col justify-center rounded-2xl bg-slate-50 border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("lProfit")}</p>
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg shadow-sm",
                    item.Profit >= 0 ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  )}>
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <p className={cn("text-3xl font-black tracking-tight", item.Profit >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {money(item.Profit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unit & Qty Metrics */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <Tag className="h-4 w-4" />
              {t("qtyPriceTitle")}
            </h3>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 items-end">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("lQty")}</p>
                <p className="text-base font-black text-slate-700">{item.Quantity.toFixed(2)}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("lUnit")}</p>
                <p className="text-base font-bold text-slate-700">{item.Unit || t("notAvailable")}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("lUnitCost")}</p>
                <p className="text-base font-bold text-slate-700">{money(item.Unit_Cost)}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("lPctInvoiced")}</span>
                  <span className="text-xs font-bold text-blue-600">{percentInvoiced.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500 shadow-sm" 
                    style={{ width: `${Math.min(100, percentInvoiced)}%` }} 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
