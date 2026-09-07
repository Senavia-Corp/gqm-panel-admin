'use client'

/**
 * U-07 — segunda copia, idéntica byte a byte, del `use-toast` de shadcn.
 *
 * Había DOS stores de avisos muertos: `@/components/ui/use-toast` (28
 * ficheros) y éste (15). Ninguno de los dos se pintaba: el `<Toaster />` que
 * los renderiza no existe en el repositorio y `app/layout.tsx` monta el de
 * sonner, que escucha otro store. Y como eran dos copias separadas, arreglar
 * una dejaba la otra muda — que es exactamente lo que pasó al medirlo: el
 * aviso «Denied» de la ficha del subcontratista volvió, y el de /profile
 * seguía sin salir.
 *
 * Se reexporta el otro módulo en vez de duplicar el adaptador, para que no
 * vuelva a haber dos verdades.
 */
export { useToast, toast } from '@/components/ui/use-toast'
export type { ToastOptions } from '@/components/ui/use-toast'
