import { redirect } from "next/navigation"

// REG-030: los técnicos viven como pestaña dentro de Subcontractors
// (decisión: no crear una lista nueva). Evita el 404 al truncar la URL.
export default function TechniciansIndex() {
  redirect("/subcontractors")
}
