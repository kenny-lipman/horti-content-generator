import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-semibold tracking-tight">
        Product niet gevonden
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Het opgevraagde product bestaat niet of is niet meer beschikbaar.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">
          <ArrowLeft className="size-4" />
          Terug naar catalogus
        </Link>
      </Button>
    </div>
  )
}
