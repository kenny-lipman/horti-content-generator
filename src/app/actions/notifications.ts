'use server'

import { getOrganizationIdOrDev } from '@/lib/data/auth'
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
  const success = await markAsRead(notificationId)
  return { success }
}

export async function markAllAsReadAction(): Promise<{ success: boolean }> {
  const organizationId = await getOrganizationIdOrDev()
  const success = await markAllAsRead(organizationId)
  return { success }
}
