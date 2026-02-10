"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[error boundary]", error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-destructive" strokeWidth={1.5} />
      <h2 className="text-lg font-semibold">Er ging iets mis</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Er is een onverwachte fout opgetreden. Probeer het opnieuw of ga terug naar de catalogus.
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-muted-foreground">
          Foutcode: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Opnieuw proberen</Button>
        <Button variant="outline" asChild>
          <a href="/">Naar catalogus</a>
        </Button>
      </div>
    </div>
  )
}
