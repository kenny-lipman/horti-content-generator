import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth callback — bevestigt e-mail verificatie tokens.
 * Supabase stuurt gebruikers hierheen na klikken op verificatie-link.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Valideer redirect: moet beginnen met / en niet met // (open redirect preventie)
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // Auth code error — redirect to login with error
  return NextResponse.redirect(
    `${origin}/login?message=${encodeURIComponent('Verificatie mislukt. Probeer opnieuw.')}`
  )
}
