import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

/**
 * Supabase server client — voor gebruik in Server Components, Route Handlers, Server Actions.
 * Schema: horti (NIET public!)
 *
 * In development zonder auth sessie valt dit terug op de admin client
 * zodat RLS geen queries blokkeert tijdens lokale ontwikkeling.
 */
export async function createClient() {
  const cookieStore = await cookies()

  // In dev: altijd admin client zodat RLS geen queries blokkeert
  // (stale/expired cookies zouden anders de normale client activeren)
  if (process.env.NODE_ENV !== 'production') {
    return createAdminClient()
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'horti' },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore errors in Server Components (read-only)
          }
        },
      },
    }
  )
}

/**
 * Supabase admin client — voor server-side operaties die RLS bypassen.
 * Gebruik ALLEEN in API routes en server actions, NOOIT in client code.
 */
export function createAdminClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js')
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'horti' },
      auth: { persistSession: false },
    }
  )
}
