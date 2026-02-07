import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Leaf } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Inloggen - Floriday Content Generator",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams

  // If already logged in, redirect to home
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect("/")
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Leaf className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welkom terug
          </h1>
          <p className="text-sm text-muted-foreground">
            Log in om door te gaan met Floriday Content Generator
          </p>
        </div>

        {message && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {message}
          </div>
        )}

        <LoginForm />
      </div>
    </div>
  )
}
