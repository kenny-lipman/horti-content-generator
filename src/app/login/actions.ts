'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureUserHasOrganization } from '@/lib/data/auth'

// ============================================
// Login
// ============================================

export async function login(formData: FormData): Promise<{ error?: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Vul je e-mailadres en wachtwoord in.' }
  }

  const supabase = await createClient()
  const { error, data } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message === 'Invalid login credentials'
      ? 'Onjuist e-mailadres of wachtwoord.'
      : error.message }
  }

  // Zorg dat user een organisatie heeft
  if (data.user) {
    try {
      await ensureUserHasOrganization(
        data.user.id,
        data.user.email!,
        data.user.user_metadata?.org_name
      )
    } catch (e) {
      console.error('[login] ensureUserHasOrganization failed:', e)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

// ============================================
// Signup
// ============================================

export async function signup(formData: FormData): Promise<{ error?: string; message?: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const orgName = (formData.get('org_name') as string)?.trim() || undefined

  if (!email || !password) {
    return { error: 'Vul je e-mailadres en wachtwoord in.' }
  }

  if (password.length < 6) {
    return { error: 'Wachtwoord moet minimaal 6 tekens bevatten.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { org_name: orgName },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Dit e-mailadres is al geregistreerd. Probeer in te loggen.' }
    }
    return { error: error.message }
  }

  return { message: 'Check je e-mail om je account te bevestigen.' }
}

// ============================================
// Password Reset
// ============================================

export async function resetPassword(formData: FormData): Promise<{ error?: string; message?: string }> {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Vul je e-mailadres in.' }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { message: 'Als dit e-mailadres bij ons bekend is, ontvang je een resetlink.' }
}

// ============================================
// Update Password (after reset)
// ============================================

export async function updatePassword(formData: FormData): Promise<{ error?: string }> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!password || !confirmPassword) {
    return { error: 'Vul beide wachtwoordvelden in.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Wachtwoorden komen niet overeen.' }
  }

  if (password.length < 6) {
    return { error: 'Wachtwoord moet minimaal 6 tekens bevatten.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
