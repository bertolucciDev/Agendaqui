export interface SupportAccount {
  id: string
  name: string
  email: string
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'BLOCKED'
  createdAt: string
}

export interface SupportAccountSearchItem extends SupportAccount {
  businessNames: string[]
}

export interface SupportAccountSearchPage {
  items: SupportAccountSearchItem[]
  page: number
  limit: number
  total: number
}

export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type SupportTicketCategory = 'ACCOUNT_ACCESS' | 'BUSINESS' | 'APPOINTMENT' | 'BILLING' | 'TECHNICAL' | 'OTHER'
export type SupportTicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export const SUPPORT_TICKET_CATEGORIES: { value: SupportTicketCategory; label: string }[] = [
  { value: 'ACCOUNT_ACCESS', label: 'Acesso à conta' },
  { value: 'BUSINESS', label: 'Negócio' },
  { value: 'APPOINTMENT', label: 'Agendamento' },
  { value: 'BILLING', label: 'Pagamentos' },
  { value: 'TECHNICAL', label: 'Problema técnico' },
  { value: 'OTHER', label: 'Outros' },
]

export const SUPPORT_TICKET_PRIORITIES: { value: SupportTicketPriority; label: string }[] = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

export interface SupportMessage {
  id: string
  conversationId: string
  senderUserId: string
  body: string
  createdAt: string
  sender: { id: string; name: string }
}

export interface SupportAgent {
  id: string
  name: string
}

export interface SupportTicketNote {
  id: string
  supportTicketId: string
  authorUserId: string
  body: string
  createdAt: string
  author: { id: string; name: string }
}

export interface SupportRating {
  id: string
  supportTicketId: string
  requesterUserId: string
  supportUserId: string
  score: number
  createdAt: string
}

export interface SupportRatingSubmission {
  rating: SupportRating
  message: SupportMessage
}

export interface SupportRankingEntry {
  supportUserId: string
  name: string
  average: number
  total: number
}

export interface SupportTicket {
  id: string
  requesterUserId: string
  assignedSupportUserId: string | null
  subject: string
  status: SupportTicketStatus
  category: SupportTicketCategory
  priority?: SupportTicketPriority
  createdAt: string
  updatedAt: string
  acceptedAt: string | null
  requester: { id: string; name: string; email: string }
  assignee: { id: string; name: string; email: string } | null
  conversation: { id: string; messages: SupportMessage[] } | null
  rating?: SupportRating | null
}

export interface SupportQueue {
  tickets: SupportTicket[]
  ranking: SupportRankingEntry[]
  counts: { OPEN: number; IN_PROGRESS: number; RESOLVED: number; CLOSED: number; total: number }
  supportAgents: SupportAgent[]
  page: number
  limit: number
  total: number
}
