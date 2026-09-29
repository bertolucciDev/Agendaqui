import { businessVerificationApi } from '@/services/api/business-verification'
import type { BusinessVerificationDocumentType } from '@/types/business-verification'
import { describeError } from './errors'
import { sha256Hex } from './sha256'

/**
 * Pipeline de documento: presign → upload → complete.
 *
 * O frontend NUNCA vê credencial de storage: só a signed URL temporária
 * devolvida no presign (60s) e a `storageKey` que o complete exige. A
 * validação de verdade (magic bytes, tamanho, hash, versão) é do backend —
 * aqui só há uma checagem de conforto para não gastar uma URL com um
 * arquivo que seria rejeitado.
 */

export type DocumentUploadPhase =
  | 'idle'
  | 'presigned'
  | 'uploading'
  | 'uploaded'
  | 'completed'
  | 'error'

export interface DocumentUploadState {
  phase: DocumentUploadPhase
  fileName: string | null
  error: string | null
}

export const INITIAL_DOCUMENT_STATE: DocumentUploadState = {
  phase: 'idle',
  fileName: null,
  error: null,
}

export class DocumentUploadError extends Error {
  constructor(
    override readonly message: string,
    readonly action: 'presign' | 'upload' | 'complete',
  ) {
    super(message)
    this.name = 'DocumentUploadError'
  }
}

/**
 * Checagem de conforto antes de pedir a URL. Não é controle de segurança:
 * quem valida é o backend, lendo o objeto real. Serve para não enviar 20MB
 * e receber um 422 sem explicação.
 */
function assertAcceptable(
  file: File,
  allowedContentTypes: readonly string[],
  maxSizeBytes: number,
): void {
  if (allowedContentTypes.length > 0 && !allowedContentTypes.includes(file.type)) {
    throw new DocumentUploadError(
      `Formato não aceito. Envie ${allowedContentTypes.join(', ')}.`,
      'presign',
    )
  }
  if (file.size > maxSizeBytes) {
    throw new DocumentUploadError(
      `Arquivo maior que o limite de ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB.`,
      'presign',
    )
  }
}

export interface UploadDependencies {
  presign: typeof businessVerificationApi.presignDocument
  complete: typeof businessVerificationApi.completeDocument
  hash: typeof sha256Hex
  put: typeof fetch
}

const defaultDependencies: UploadDependencies = {
  presign: businessVerificationApi.presignDocument,
  complete: businessVerificationApi.completeDocument,
  hash: sha256Hex,
  put: (...args) => fetch(...args),
}

export async function uploadVerificationDocument(
  file: File,
  documentType: BusinessVerificationDocumentType,
  onPhase: (phase: DocumentUploadPhase) => void,
  deps: UploadDependencies = defaultDependencies,
): Promise<{ documentId: string; version: number }> {
  onPhase('presigned')

  let presign
  try {
    presign = await deps.presign({ documentType, contentType: file.type })
  } catch (error) {
    // A URL nunca saiu: o estado vai direto a `error`, sem `uploading`.
    onPhase('error')
    throw new DocumentUploadError(describeError(error, 'presign'), 'presign')
  }

  try {
    assertAcceptable(file, presign.allowedContentTypes, presign.maxSizeBytes)
  } catch (error) {
    onPhase('error')
    throw error
  }

  onPhase('uploading')

  let response: Response
  try {
    response = await deps.put(presign.url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })
  } catch (error) {
    onPhase('error')
    throw new DocumentUploadError(describeError(error, 'upload'), 'upload')
  }

  if (!response.ok) {
    onPhase('error')
    throw new DocumentUploadError(
      `O armazenamento recusou o arquivo (HTTP ${response.status}). Tente novamente.`,
      'upload',
    )
  }

  onPhase('uploaded')

  try {
    const sha256 = await deps.hash(file)
    const result = await deps.complete({ documentType, storageKey: presign.storageKey, sha256 })
    onPhase('completed')
    return result
  } catch (error) {
    onPhase('error')
    throw new DocumentUploadError(describeError(error, 'complete'), 'complete')
  }
}
