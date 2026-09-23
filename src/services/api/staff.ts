import { apiClient } from '@/lib/axios/client'
import type { Membership, MembershipRole, WorkingHoursEntry, TimeOff } from '@/types'

export const staffApi = {
  listByLocation: async (locationId: string) => {
    const { data } = await apiClient.get<Membership[]>(
      `locations/${locationId}/employees`
    )
    return data
  },

  listByBusiness: async (businessId: string) => {
    const { data } = await apiClient.get<Membership[]>(
      `businesses/${businessId}/employees`
    )
    return data
  },

  addEmployee: async (
    locationId: string,
    payload: { userId: string; role: string; position: string }
  ) => {
    const { data } = await apiClient.post<Membership>(
      `locations/${locationId}/employees`,
      payload
    )
    return data
  },

  updateEmployee: async (
    employeeMembershipId: string,
    payload: { position?: string; active?: boolean; role?: MembershipRole }
  ) => {
    const { data } = await apiClient.put<Membership>(
      `employees/${employeeMembershipId}`,
      payload
    )
    return data
  },

  removeEmployee: async (employeeMembershipId: string) => {
    await apiClient.delete(`employees/${employeeMembershipId}`)
  },

  setWorkingHours: async (
    employeeMembershipId: string,
    entries: WorkingHoursEntry[]
  ) => {
    await apiClient.put(`employees/${employeeMembershipId}/working-hours`, {
      entries,
    })
  },

  requestTimeOff: async (
    employeeMembershipId: string,
    payload: {
      type: string
      startAt: string
      endAt: string
      reason?: string
    }
  ) => {
    const { data } = await apiClient.post<TimeOff>(
      `employees/${employeeMembershipId}/time-offs`,
      payload
    )
    return data
  },

  approveTimeOff: async (id: string) => {
    await apiClient.put(`time-offs/${id}/approve`)
  },

  rejectTimeOff: async (id: string) => {
    await apiClient.put(`time-offs/${id}/reject`)
  },

  assignProfessional: async (
    serviceId: string,
    employeeMembershipId: string
  ) => {
    await apiClient.post(
      `services/${serviceId}/professionals?employeeMembershipId=${employeeMembershipId}`
    )
  },

  unassignProfessional: async (
    serviceId: string,
    employeeMembershipId: string
  ) => {
    await apiClient.delete(
      `services/${serviceId}/professionals?employeeMembershipId=${employeeMembershipId}`
    )
  },

  inviteEmployee: async (
    businessId: string,
    payload: {
      email: string
      locationId: string
      role: string
      position: string
    }
  ) => {
    await apiClient.post(`businesses/${businessId}/invites`, payload)
  },
}
