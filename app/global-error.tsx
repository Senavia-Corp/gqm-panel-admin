"use client"

// REG-031/REG-085: boundary de último recurso (cubre errores del layout raíz).
// Renderiza su propio <html> — sin providers, texto fijo bilingüe.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error("[global-error]", error)
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 32,
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>
            Something went wrong / Algo salió mal
          </h2>
          <button
            onClick={reset}
            style={{
              background: "#14532d",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Try again / Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
