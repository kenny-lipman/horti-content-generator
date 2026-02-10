"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="nl">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Er ging iets mis
          </h2>
          <p style={{ color: "#666", marginTop: "0.5rem", fontSize: "0.875rem" }}>
            Er is een kritieke fout opgetreden. Probeer de pagina opnieuw te laden.
          </p>
          {error.digest && (
            <p style={{ color: "#999", marginTop: "0.25rem", fontSize: "0.75rem" }}>
              Foutcode: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1.5rem",
              backgroundColor: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Opnieuw laden
          </button>
        </div>
      </body>
    </html>
  )
}
