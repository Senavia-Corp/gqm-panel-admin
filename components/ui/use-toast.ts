'use client'

/**
 * U-07 — los avisos de esta cola no se pintaban en ninguna parte.
 *
 * Esto era la implementación shadcn/radix de `toast()`: un store en memoria
 * que sólo se ve si alguien monta `<Toaster />` de `@/components/ui/toaster`.
 * Ese componente NO EXISTE en el repositorio y nadie lo importa. `app/layout.tsx`
 * monta el `<Toaster />` de **sonner**, que escucha un store distinto.
 *
 * Resultado: los 28 ficheros que llaman a `toast()` desde aquí —132 avisos de
 * error, 174 títulos— escribían en una cola que nadie renderiza. Medido en el
 * navegador: un subcontratista pulsa «Delete» en la tarjeta de un técnico, el
 * manejador ejecuta `toast({ title: "Denied", ... })` y en pantalla no ocurre
 * absolutamente nada: ni diálogo, ni aviso, ni petición. Un botón mudo.
 *
 * Para el portal es lo más grave de la pantalla: el subcontratista no tiene
 * a nadie a quien preguntar, y la aplicación le contestaba con silencio.
 *
 * En vez de tocar 28 ficheros, este módulo reenvía a sonner —el `<Toaster />`
 * que sí está montado— manteniendo la firma `{ title, description, variant }`
 * que ya usan todos. Comprobado antes de escribirlo: nadie lee el array
 * `toasts` ni el objeto que devolvía `toast()`, y la única variante en uso es
 * `"destructive"` (132 apariciones).
 */
import { toast as sonner } from 'sonner'

/**
 * El tipo dice TEXTO, no `ReactNode`, a propósito.
 *
 * La primera versión declaraba `title?: React.ReactNode`, así que TypeScript
 * aceptaba JSX — y el runtime lo descartaba sin decir nada: el aviso salía en
 * blanco o perdía el título. Un tipo que promete lo que no cumple es peor que
 * uno estrecho. Comprobado con grep sobre los 43 llamadores: **ninguno** pasa
 * JSX hoy, así que estrecharlo no rompe nada y convierte ese fallo silencioso
 * en un error de compilación el día que alguien lo intente.
 */
export type ToastOptions = {
  title?: string | number | null
  description?: string | number | null
  variant?: 'default' | 'destructive'
  duration?: number
}

function textoPlano(v: string | number | null | undefined): string | undefined {
  if (v === null || v === undefined) return undefined
  return typeof v === 'number' ? String(v) : v
}

/** Un error tiene que dar tiempo a leerlo. Los 4 s por defecto de sonner no. */
const DURACION_ERROR = 10_000

function toast({ title, description, variant, duration }: ToastOptions = {}) {
  const encabezado = textoPlano(title)
  const detalle = textoPlano(description)
  // Sin título, el cuerpo pasa a ser el mensaje: sonner no pinta nada con un
  // primer argumento vacío, y varios llamadores mandan solo `description`.
  const mensaje = encabezado ?? detalle ?? ''
  const esError = variant === 'destructive'
  const opciones = {
    description: encabezado ? detalle : undefined,
    duration: duration ?? (esError ? DURACION_ERROR : undefined),
  }
  const id = esError ? sonner.error(mensaje, opciones) : sonner(mensaje, opciones)
  return {
    // El id se devuelve TAL CUAL. Los de sonner son números (un contador
    // interno), y pasarlo por `String()` daba un id que `sonner.dismiss()` ya
    // no reconoce: quedaba un descarte que no descarta.
    id,
    dismiss: () => sonner.dismiss(id),
    update: () => {},
  }
}

/**
 * `useToast()` se usa en 16 sitios solo para desestructurar `toast`. Se
 * mantiene la forma para no tocarlos. `toasts` va vacío a propósito: nadie lo
 * lee, y devolver una lista que ya no gobierna nada sería mentir.
 */
function useToast() {
  return {
    toasts: [] as const,
    toast,
    dismiss: (toastId?: string | number) => sonner.dismiss(toastId),
  }
}

export { useToast, toast }
