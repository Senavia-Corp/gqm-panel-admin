"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface OrderDetailsDialogProps {
  order: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  if (!order) return null

  const items = order.Items ?? []
  const totalBuilder = items.reduce((sum: number, item: any) => sum + (item.Builder_cost || 0), 0)
  const totalClient = items.reduce((sum: number, item: any) => sum + (item.Client_price || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={[
          // ✅ FORZAR ancho por encima de defaults tipo "sm:max-w-lg"
          "!w-[96vw] !max-w-[1200px] md:!w-[92vw] xl:!w-[85vw]",
          // ✅ No forzar alto fijo (quita el espacio en blanco)
          "!max-h-[90vh]",
          // ✅ Layout + overflow controlado
          "!overflow-hidden flex flex-col",
          // ✅ padding controlado por secciones
          "!p-0",
        ].join(" ")}
      >
        {/* Header fijo */}
        <div className="border-b bg-white px-8 py-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Order Details</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">{order.Title || "Standard Order"}</h3>
          </div>
        </div>

        {/* Body scrolleable (importante: min-h-0 en flex layouts) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-6 rounded-2xl bg-violet-50/50 border border-violet-100 relative overflow-hidden group">
                <div className="relative z-10">
                  <Label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-violet-400">Formula</Label>
                  <div className="text-3xl font-black text-violet-700 tabular-nums">
                    ${Number(order.Formula || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-violet-400 font-medium mt-1">Sum of builder costs</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 relative overflow-hidden group">
                <div className="relative z-10">
                  <Label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-emerald-400">Adj. Formula</Label>
                  <div className="text-3xl font-black text-emerald-700 tabular-nums">
                    ${Number(order.Adj_formula || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-emerald-400 font-medium mt-1">Adjusted formula (COs included)</p>
                </div>
              </div>
            </div>

            {/* Estimate Costs Table */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="h-5 w-1 rounded-full bg-slate-300" />
                <h4 className="font-black text-slate-700 uppercase tracking-wider text-xs">Estimate Costs</h4>
              </div>

              {items.length > 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-max w-full">
                      <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Title</th>
                          <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Cost Code</th>
                          <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Category</th>
                          <th className="px-4 py-4 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                          <th className="px-4 py-4 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Unit Cost</th>
                          <th className="px-4 py-4 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Builder Cost</th>
                          <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Client Price</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-50">
                        {items.map((item: any, index: number) => (
                          <tr key={item.ID_EstimateCost || index} className="hover:bg-slate-50/30 transition-colors group">
                            <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">{item.Title ?? "—"}</td>
                            <td className="px-4 py-4 text-slate-400 font-mono text-xs whitespace-nowrap">{item.Cost_code ?? "—"}</td>
                            <td className="px-4 py-4 text-slate-400 text-[11px] max-w-[320px] truncate" title={item.Category ?? ""}>{item.Category ?? "—"}</td>
                            <td className="px-4 py-4 text-right tabular-nums text-slate-600 font-bold whitespace-nowrap">{item.Quatity || item.Quantity || "—"}</td>
                            <td className="px-4 py-4 text-right tabular-nums text-slate-500 whitespace-nowrap">
                              ${Number(item.Unit_cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-violet-600 tabular-nums whitespace-nowrap">
                              ${Number(item.Builder_cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums whitespace-nowrap">
                              ${Number(item.Client_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot className="bg-slate-50/50 border-t border-slate-100">
                        <tr>
                          <td colSpan={5} className="px-6 py-5 text-right font-black text-slate-400 uppercase tracking-widest text-[11px] whitespace-nowrap">
                            Totals
                          </td>
                          <td className="px-4 py-5 text-right font-black text-violet-700 text-lg tabular-nums whitespace-nowrap">
                            ${totalBuilder.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-5 text-right font-black text-emerald-700 text-lg tabular-nums whitespace-nowrap">
                            ${totalClient.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No estimate costs found for this order</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}