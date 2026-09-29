import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { BusinessVerification } from '@/types/business-verification'
import {
  uploadVerificationDocument,
  DocumentUploadError,
  type UploadDependencies,
} from '../upload-document'

/**
 * Pipeline presign → upload → complete.
 *
 * Cobre a máquina de estados exigida pela fatia 2, e prova que nenhuma
 * credencial de storage é usada: o PUT vai para a signed URL temporária, e o
 * `complete` leva `storageKey` + `sha256` — nunca uma chave de credencial.
 */

function presignOutput(overrides: Record<string, unknown> = {}) {
  return {
    documentType: 'CPF_FRENTE',
    url: 'https://signed.example/upload?token=abc',
    storageKey: 'documents/v1/CPF_FRENTE/uuid.jpg',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    maxSizeBytes: 10 * 1024 * 1024,
    allowedContentTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    ...overrides,
  }
}

function file(bytes = 8, name = 'frente.jpg', type = 'image/jpeg') {
  return new File([new Uint8Array(bytes)], name, { type })
}

interface Mocks {
  presign: ReturnType<typeof vi.fn>
  complete: ReturnType<typeof vi.fn>
  hash: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
}

function deps(overrides: Partial<Mocks> = {}): Mocks & UploadDependencies {
  return {
    presign: vi.fn(async () => presignOutput()),
    complete: vi.fn(async () => ({ documentId: 'doc_1', version: 1 })),
    hash: vi.fn(async () => 'a'.repeat(64)),
    put: vi.fn(async () => new Response('', { status: 200 })),
    ...overrides,
  } as unknown as Mocks & UploadDependencies
}

describe('uploadVerificationDocument', () => {
  beforeEach(() => vi.clearAllMocks())

  it('O-06: percorre presigned → uploading → uploaded → completed na ordem', async () => {
    const phases: string[] = []
    const d = deps()

    const result = await uploadVerificationDocument(file(), 'CPF_FRENTE', (p) => phases.push(p), d)

    expect(phases).toEqual(['presigned', 'uploading', 'uploaded', 'completed'])
    expect(result).toEqual({ documentId: 'doc_1', version: 1 })
  })

  it('O-06: envia o arquivo para a signed URL via PUT', async () => {
    const d = deps()
    const f = file()

    await uploadVerificationDocument(f, 'CPF_FRENTE', () => {}, d)

    expect(d.presign).toHaveBeenCalledWith({ documentType: 'CPF_FRENTE', contentType: 'image/jpeg' })
    expect(d.put).toHaveBeenCalledTimes(1)
    const [url, init] = (d.put as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    expect(url).toBe('https://signed.example/upload?token=abc')
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(f)
  })

  it('O-06: complete recebe exatamente documentType, storageKey e sha256', async () => {
    const d = deps()
    await uploadVerificationDocument(file(), 'CPF_FRENTE', () => {}, d)

    // Campos extras aqui seriam 400 (forbidNonWhitelisted no backend).
    expect(d.complete).toHaveBeenCalledWith({
      documentType: 'CPF_FRENTE',
      storageKey: 'documents/v1/CPF_FRENTE/uuid.jpg',
      sha256: 'a'.repeat(64),
    })
  })

  it('O-14: recusa formato não aceito antes de gastar a signed URL', async () => {
    const d = deps()
    const phases: string[] = []

    await expect(
      uploadVerificationDocument(file(4, 'x.gif', 'image/gif'), 'CPF_FRENTE', (p) => phases.push(p), d),
    ).rejects.toThrow(DocumentUploadError)

    // O PUT e o complete nunca acontecem: a falha é de primeira linha.
    expect(d.put).not.toHaveBeenCalled()
    expect(d.complete).not.toHaveBeenCalled()
    expect(phases).toContain('error')
  })

  it('O-14: recusa arquivo acima do limite informado no presign', async () => {
    const d = deps({
      presign: vi.fn(async () => presignOutput({ maxSizeBytes: 2 })),
    })

    await expect(
      uploadVerificationDocument(file(64), 'CPF_FRENTE', () => {}, d),
    ).rejects.toThrow(/limite de 0MB/)
    expect(d.put).not.toHaveBeenCalled()
  })

  it('O-14: erro de presign vira estado error e não tenta upload', async () => {
    const d = deps({
      presign: vi.fn(async () => {
        const e = new Error('boom')
        throw e
      }),
    })
    const phases: string[] = []

    await expect(
      uploadVerificationDocument(file(), 'CPF_FRENTE', (p) => phases.push(p), d),
    ).rejects.toThrow(DocumentUploadError)
    expect(d.put).not.toHaveBeenCalled()
    expect(phases).toContain('error')
  })

  it('O-14: PUT recusado pelo storage vira erro com o status, sem chamar complete', async () => {
    const d = deps({ put: vi.fn(async () => new Response('', { status: 403 })) })

    await expect(
      uploadVerificationDocument(file(), 'CPF_FRENTE', () => {}, d),
    ).rejects.toThrow(/HTTP 403/)
    expect(d.complete).not.toHaveBeenCalled()
  })

  it('O-14: falha de rede no PUT vira erro de upload', async () => {
    const d = deps({
      put: vi.fn(async () => {
        throw new Error('network down')
      }),
    })

    await expect(
      uploadVerificationDocument(file(), 'CPF_FRENTE', () => {}, d),
    ).rejects.toThrow(DocumentUploadError)
    expect(d.complete).not.toHaveBeenCalled()
  })

  it('erro no complete (ex.: 409 de sha divergente) é reportado como complete', async () => {
    const d = deps({
      complete: vi.fn(async () => {
        throw new Error('conflito')
      }),
    })
    const phases: string[] = []

    await expect(
      uploadVerificationDocument(file(), 'CPF_FRENTE', (p) => phases.push(p), d),
    ).rejects.toThrow(DocumentUploadError)
    // O PUT já aconteceu: o objeto existe, mas não foi validado.
    expect(d.put).toHaveBeenCalledTimes(1)
    expect(phases[phases.length - 1]).toBe('error')
  })

  it('não usa businesses[0] nem qualquer catálogo de sessão', async () => {
    const d = deps()
    await uploadVerificationDocument(file(), 'COMPROVANTE_CNPJ', () => {}, d)
    const [url, init] = (d.put as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    expect(init.headers).toEqual({ 'Content-Type': 'image/jpeg' })
    expect(url).not.toContain('business')
  })
})

/* Guarda de tipo: as fixtures acima precisam continuar compatível com o contrato. */
const _typeGuard: Pick<BusinessVerification, 'missingDocumentTypes'> = { missingDocumentTypes: [] }
void _typeGuard
