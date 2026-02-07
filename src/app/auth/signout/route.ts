import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Sign out — logt de gebruiker uit.
 * Retourneert JSON zodat de client de redirect kan afhandelen.
 */
export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
