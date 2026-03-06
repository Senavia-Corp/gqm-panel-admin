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
        <div className="border-b bg-white px-6 py-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-2xl">Order Details</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-1">
            <h3 className="text-xl font-semibold">{order.Title}</h3>
            <p className="text-sm text-muted-foreground">{order.ID_Order}</p>
          </div>
        </div>

        {/* Body scrolleable (importante: min-h-0 en flex layouts) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <Label className="mb-2 block text-sm font-medium text-blue-900">Formula</Label>
                <div className="text-2xl font-bold text-blue-900">${Number(order.Formula || 0).toFixed(2)}</div>
                <p className="text-xs text-blue-700 mt-1">Sum of builder costs</p>
              </div>

              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <Label className="mb-2 block text-sm font-medium text-green-900">Adj. Formula</Label>
                <div className="text-2xl font-bold text-green-900">${Number(order.Adj_formula || 0).toFixed(2)}</div>
                <p className="text-xs text-green-700 mt-1">Adjusted formula</p>
              </div>
            </div>

            {/* Estimate Costs Table */}
            <div>
              <h4 className="font-semibold text-lg mb-3">Estimate Costs</h4>

              {items.length > 0 ? (
                <div className="rounded-md border bg-white">
                  <div className="overflow-x-auto">
                    {/* ✅ min-w-max ayuda a que la tabla no “colapse” y se vea apretada */}
                    <table className="min-w-max w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Title</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Cost Code</th>
                          <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Category</th>
                          <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Quantity</th>
                          <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Unit Cost</th>
                          <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Builder Cost</th>
                          <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Client Price</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {items.map((item: any, index: number) => (
                          <tr key={item.ID_EstimateCost || index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium whitespace-nowrap">{item.Title ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{item.Cost_code ?? "—"}</td>
                            <td
                              className="px-4 py-3 text-muted-foreground text-xs max-w-[32rem] truncate"
                              title={item.Category ?? ""}
                            >
                              {item.Category ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">{item.Quatity ?? "—"}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              ${Number(item.Unit_cost || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-blue-900 whitespace-nowrap">
                              ${Number(item.Builder_cost || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-green-900 whitespace-nowrap">
                              ${Number(item.Client_price || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot className="bg-gray-50 border-t-2">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                            Totals:
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-blue-900 whitespace-nowrap">
                            ${totalBuilder.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-900 whitespace-nowrap">
                            ${totalClient.toFixed(2)}
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