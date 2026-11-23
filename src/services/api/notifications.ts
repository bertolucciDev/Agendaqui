import { apiClient } from '@/lib/axios/client'

export interface NotificationPreference {
  emailAppointmentRemindersEnabled: boolean
}

export interface UserNotificationItem {
  id: string
  type: 'APPOINTMENT_REMINDER'
  title: string
  body: string
  appointmentId: string
  readAt: string | null
  emailSentAt: string | null
  createdAt: string
  appointment: { startsAt: string }
}

export interface UserNotificationPage {
  items: UserNotificationItem[]
  unreadCount: number
}

export const notificationsApi = {
  getPreference: async (): Promise<NotificationPreference> => {
    const { data } = await apiClient.get<NotificationPreference>('notifications/preferences')
    return data
  },

  updatePreference: async (emailAppointmentRemindersEnabled: boolean): Promise<NotificationPreference> => {
    const { data } = await apiClient.patch<NotificationPreference>('notifications/preferences', {
      emailAppointmentRemindersEnabled,
    })
    return data
  },

  list: async (limit = 20): Promise<UserNotificationPage> => {
    const { data } = await apiClient.get<UserNotificationPage>(`notifications?limit=${limit}`)
    return data
  },

  markRead: async (id: string): Promise<UserNotificationItem> => {
    const { data } = await apiClient.patch<UserNotificationItem>(`notifications/${id}/read`)
    return data
  },
}
