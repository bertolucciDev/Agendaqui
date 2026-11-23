import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, patch } = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}))

vi.mock('@/lib/axios/client', () => ({ apiClient: { get, patch } }))

describe('notificationsApi contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses authenticated notification endpoints without a user id in the path or payload', async () => {
    get.mockResolvedValue({ data: { emailAppointmentRemindersEnabled: false } })
    patch.mockResolvedValue({ data: { emailAppointmentRemindersEnabled: true } })
    const { notificationsApi } = await import('@/services/api/notifications')

    await notificationsApi.getPreference()
    await notificationsApi.updatePreference(true)
    await notificationsApi.list(20)
    await notificationsApi.markRead('notification-1')

    expect(get).toHaveBeenNthCalledWith(1, 'notifications/preferences')
    expect(patch).toHaveBeenNthCalledWith(1, 'notifications/preferences', {
      emailAppointmentRemindersEnabled: true,
    })
    expect(get).toHaveBeenNthCalledWith(2, 'notifications?limit=20')
    expect(patch).toHaveBeenNthCalledWith(2, 'notifications/notification-1/read')
  })
})
