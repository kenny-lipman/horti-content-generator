import 'server-only'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Json, Notification, NotificationInsert, NotificationType } from '@/lib/supabase/types'

// ============================================
// Read
// ============================================

/**
 * Haal notificaties op voor een organisatie, nieuwste eerst.
 */
export async function getNotifications(
  organizationId: string,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<Notification[]> {
  const { limit = 20, unreadOnly = false } = options
  const supabase = await createClient()

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getNotifications] Error:', error.message)
    return []
  }

  return data ?? []
}

/**
 * Tel het aantal ongelezen notificaties.
 */
export async function getUnreadCount(organizationId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('read', false)

  if (error) {
    console.error('[getUnreadCount] Error:', error.message)
    return 0
  }

  return count ?? 0
}

// ============================================
// Write
// ============================================

/**
 * Maak een nieuwe notificatie aan.
 */
export async function createNotification(data: {
  organizationId: string
  userId?: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
}): Promise<string | null> {
  const supabase = createAdminClient()

  const insert: NotificationInsert = {
    organization_id: data.organizationId,
    user_id: data.userId ?? null,
    type: data.type,
    title: data.title,
    message: data.message,
    data: (data.data ?? {}) as { [key: string]: Json | undefined },
  }

  const { data: notification, error } = await supabase
    .from('notifications')
    .insert(insert)
    .select('id')
    .single()

  if (error || !notification) {
    console.error('[createNotification] Error:', error?.message)
    return null
  }

  return notification.id
}

// ============================================
// Update
// ============================================

/**
 * Markeer een notificatie als gelezen.
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('[markAsRead] Error:', error.message)
    return false
  }

  return true
}

/**
 * Markeer alle notificaties als gelezen voor een organisatie.
 */
export async function markAllAsRead(organizationId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('organization_id', organizationId)
    .eq('read', false)

  if (error) {
    console.error('[markAllAsRead] Error:', error.message)
    return false
  }

  return true
}
