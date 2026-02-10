import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LoginForm } from "./login-form"

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Inloggen - Floriday Content Generator",
}

export default async function LoginPage(props: {
  searchParams: Promise<{ message?: string }>
}) {
  // Redirect naar home als al ingelogd
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  const searchParams = await props.searchParams
  return <LoginForm message={searchParams.message} />
}
