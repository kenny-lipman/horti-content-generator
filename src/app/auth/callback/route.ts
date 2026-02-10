import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureUserHasOrganization } from '@/lib/data/auth'

/**
 * Auth callback — bevestigt e-mail verificatie tokens en password reset tokens.
 * Supabase stuurt gebruikers hierheen na klikken op verificatie-/reset-link.
 * Na verificatie wordt automatisch een organisatie aangemaakt als die ontbreekt.
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
      // Zorg dat de gebruiker een organisatie heeft na verificatie
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        try {
          await ensureUserHasOrganization(
            user.id,
            user.email!,
            user.user_metadata?.org_name
          )
        } catch (e) {
          console.error('[auth/callback] ensureUserHasOrganization failed:', e)
        }
      }

      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // Auth code error — redirect to login with error
  return NextResponse.redirect(
    `${origin}/login?message=${encodeURIComponent('Verificatie mislukt. Probeer opnieuw.')}`
  )
}
