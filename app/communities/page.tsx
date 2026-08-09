import { redirect } from "next/navigation"

// REG-029: las communities viven como pestaña dentro de Clients (decisión:
// no crear una lista nueva). Este índice solo evita el 404 al truncar la URL.
export default function CommunitiesIndex() {
  redirect("/clients")
}
