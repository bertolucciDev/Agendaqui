import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { getDb } from './db'
import { handleRequest, ApiError } from './handlers'
import { getStoredBusinesses, saveStoredBusiness } from '@/lib/business-store'

export function isMockEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK === 'true'
}

function seedStoredBusiness(): void {
  try {
    const stored = getStoredBusinesses()
    if (stored.length === 0) {
      saveStoredBusiness({
        businessId: 'biz_demo',
        locationId: 'loc_demo',
        membershipId: 'mem_4',
        slug: 'barbearia-elite',
        name: 'Barbearia Elite',
      })
    }
  } catch {
    // ignore
  }
}

function normalizeMethod(method?: string): 'get' | 'post' | 'put' | 'patch' | 'delete' {
  const m = (method || 'get').toLowerCase()
  if (m === 'post' || m === 'put' || m === 'patch' || m === 'delete') return m
  return 'get'
}

function toApiError(err: ApiError, config: InternalAxiosRequestConfig): AxiosError {
  const response = {
    data: { message: err.message },
    status: err.status,
    statusText: '',
    headers: {},
    config,
  }
  return new AxiosError(err.message, undefined, config, undefined, response)
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function createMockAdapter() {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    await wait(120 + Math.random() * 180)

    let body: any = config.data
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        body = {}
      }
    }

    const full = `${config.baseURL || ''}${config.url || ''}`
    let parsed: URL
    try {
      parsed = /^https?:\/\//.test(full)
        ? new URL(full)
        : new URL(full.startsWith('/') ? `http://mock.local${full}` : `http://mock.local/${full}`)
    } catch {
      parsed = new URL('http://mock.local/')
    }

    try {
      const result = handleRequest(normalizeMethod(config.method), parsed.pathname, parsed.searchParams, body)
      return {
        data: { data: result.body },
        status: result.status,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config,
      }
    } catch (e) {
      if (e instanceof ApiError) throw toApiError(e, config)
      throw e
    }
  }
}

export function initMock() {
  // Garante seed do banco e do localStorage de business antes de qualquer query.
  getDb()
  seedStoredBusiness()
  const adapter = createMockAdapter()
  axios.defaults.adapter = adapter
  return adapter
}