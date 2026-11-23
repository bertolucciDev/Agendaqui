import { apiClient } from '@/lib/axios/client'
import type {
  SupportAccount,
  SupportAccountSearchPage,
  SupportMessage,
  SupportQueue,
  SupportRatingSubmission,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportAgent,
  SupportTicketNote,
} from '@/types/support'

export interface CreateSupportTicketInput {
  subject: string
  message: string
  category: SupportTicketCategory
}

export interface SupportQueueParams {
  status?: SupportTicketStatus
  archiveStatus?: 'ACTIVE' | 'ARCHIVED'
  category?: SupportTicketCategory
  priority?: SupportTicketPriority
  assignee?: string
  page: number
  limit: number
}

export const supportApi = {
  searchAccounts: async (params: { search: string; page: number; limit: number }): Promise<SupportAccountSearchPage> => {
    const { data } = await apiClient.get<SupportAccountSearchPage>('support/users', { params })
    return data
  },
  lookupAccount: async (email: string): Promise<SupportAccount | null> => {
    const { data } = await apiClient.post<SupportAccount | null>('support/users/lookup', { email })
    return data
  },
  createTicket: async (input: CreateSupportTicketInput): Promise<SupportTicket> => {
    const { data } = await apiClient.post<SupportTicket>('help/tickets', input)
    return data
  },
  listMyTickets: async (): Promise<SupportTicket[]> => {
    const { data } = await apiClient.get<SupportTicket[]>('help/tickets')
    return data
  },
  getMyTicket: async (ticketId: string): Promise<SupportTicket> => {
    const { data } = await apiClient.get<SupportTicket>(`help/tickets/${ticketId}`)
    return data
  },
  listQueue: async (params: SupportQueueParams): Promise<SupportQueue> => {
    const { data } = await apiClient.get<SupportQueue>('support/tickets', { params })
    return data
  },
  listSupportAgents: async (): Promise<SupportAgent[]> => {
    const { data } = await apiClient.get<SupportAgent[]>('support/agents')
    return data
  },
  listInternalNotes: async (ticketId: string): Promise<SupportTicketNote[]> => {
    const { data } = await apiClient.get<SupportTicketNote[]>(`support/tickets/${ticketId}/notes`)
    return data
  },
  createInternalNote: async (ticketId: string, body: string): Promise<SupportTicketNote> => {
    const { data } = await apiClient.post<SupportTicketNote>(`support/tickets/${ticketId}/notes`, { body })
    return data
  },
  getQueueTicket: async (ticketId: string): Promise<SupportTicket> => {
    const { data } = await apiClient.get<SupportTicket>(`support/tickets/${ticketId}`)
    return data
  },
  acceptTicket: async (ticketId: string): Promise<SupportTicket> => {
    const { data } = await apiClient.post<SupportTicket>(`support/tickets/${ticketId}/accept`)
    return data
  },
  updateTicketClassification: async (
    ticketId: string,
    input: { category?: SupportTicketCategory; priority?: SupportTicketPriority },
  ): Promise<SupportTicket> => {
    const { data } = await apiClient.patch<SupportTicket>(`support/tickets/${ticketId}/classification`, input)
    return data
  },
  transferTicket: async (ticketId: string, supportUserId: string): Promise<SupportTicket> => {
    const { data } = await apiClient.patch<SupportTicket>(`support/tickets/${ticketId}/assignee`, { supportUserId })
    return data
  },
  finalizeTicket: async (ticketId: string): Promise<SupportTicket> => {
    const { data } = await apiClient.post<SupportTicket>(`support/tickets/${ticketId}/finalize`)
    return data
  },
  archiveTicket: async (ticketId: string): Promise<SupportTicket> => {
    const { data } = await apiClient.patch<SupportTicket>(`support/tickets/${ticketId}/archive`)
    return data
  },
  restoreTicket: async (ticketId: string): Promise<SupportTicket> => {
    const { data } = await apiClient.patch<SupportTicket>(`support/tickets/${ticketId}/restore`)
    return data
  },
  rateTicket: async (ticketId: string, rating: number): Promise<SupportRatingSubmission> => {
    const { data } = await apiClient.post<SupportRatingSubmission>(`help/tickets/${ticketId}/rating`, { rating })
    return data
  },
  listMessages: async (ticketId: string, scope: 'help' | 'support'): Promise<SupportMessage[]> => {
    const { data } = await apiClient.get<SupportMessage[]>(`${scope === 'help' ? 'help' : 'support'}/tickets/${ticketId}/messages`)
    return data
  },
  sendMessage: async (ticketId: string, scope: 'help' | 'support', body: string): Promise<SupportMessage> => {
    const { data } = await apiClient.post<SupportMessage>(`${scope === 'help' ? 'help' : 'support'}/tickets/${ticketId}/messages`, { body })
    return data
  },
}
