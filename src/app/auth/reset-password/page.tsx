import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ResetPasswordForm } from "./reset-form"

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Nieuw wachtwoord - Floriday Content Generator",
}

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Gebruiker moet ingelogd zijn (via de reset link → callback → session)
  if (!user) {
    redirect('/login?message=' + encodeURIComponent('Wachtwoord reset verlopen. Vraag een nieuwe link aan.'))
  }

  return <ResetPasswordForm />
}
