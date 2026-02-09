'use server'

import { getOrganizationIdOrDev } from '@/lib/data/auth'
import { createAdminClient } from '@/lib/supabase/server'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/lib/data/notifications'

export async function getNotificationsAction(options?: { limit?: number; unreadOnly?: boolean }) {
  const organizationId = await getOrganizationIdOrDev()
  return getNotifications(organizationId, options)
}

export async function getUnreadCountAction(): Promise<number> {
  const organizationId = await getOrganizationIdOrDev()
  return getUnreadCount(organizationId)
}

export async function markAsReadAction(notificationId: string): Promise<{ success: boolean }> {
  if (!notificationId) {
    return { success: false }
  }

  // Verify notification belongs to user's organization
  const orgId = await getOrganizationIdOrDev()
  const supabase = createAdminClient()
  const { data: notification } = await supabase
    .from('notifications')
    .select('id')
    .eq('id', notificationId)
    .eq('organization_id', orgId)
    .single()

  if (!notification) {
    return { success: false }
  }

  const success = await markAsRead(notificationId)
  return { success }
}

export async function markAllAsReadAction(): Promise<{ success: boolean }> {
  const organizationId = await getOrganizationIdOrDev()
  const success = await markAllAsRead(organizationId)
  return { success }
}
