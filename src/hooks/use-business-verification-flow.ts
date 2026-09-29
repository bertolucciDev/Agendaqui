import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { businessVerificationApi } from '@/services/api/business-verification'
import type {
  CreateVerificationPayload,
  UpdateVerificationPayload,
} from '@/services/api/business-verification'
import type { BusinessVerificationDocumentType } from '@/types/business-verification'
import { describeError } from '@/lib/verification/errors'
import { canEdit, canSubmit, canUploadDocuments } from '@/lib/verification/permissions'
import { uploadVerificationDocument, type DocumentUploadState } from '@/lib/verification/upload-document'

/**
 * Ações de escrita do onboarding de verificação.
 *
 * Esta camada NÃO lê a verificação: a leitura (e o polling, e o disparo do
 * D8) é do hook `useBusinessVerification`, que já é a fonte única do
 * TanStack Query para `['business-verification']`. Aqui ficam apenas as
 * mutações e o estado de erro, para que a tela não precise montar requisições
 * HTTP.
 *
 * Regras respeitadas:
 * - `create` só é usado quando não existe solicitação; DRAFT existente é
 *   preservado via `update` (PATCH) — nunca recriado;
 * - o upload segue presign → PUT → complete, sequencial, e o botão de submit
 *   fica desabilitado enquanto há upload em andamento, evitando submit antes
 *   de o documento ser validado;
 * - PENDING/APPROVED/EXPIRED/CANCELLED são decididos pelo backend; esta camada
 *   reflete `status`, `canResubmit` e `missingDocumentTypes`.
 *
 * Após cada escrita bem-sucedida invalida `['business-verification']`, para
 * que `missingDocumentTypes`/`submittedDocumentTypes` reflitam o que o servidor
 * aceitou — sem polling manual concorrente com o do hook.
 */

interface State {
  saving: boolean
  saveError: string | null
  submitting: boolean
  submitError: string | null
  notice: string | null
}

const initialState: State = {
  saving: false,
  saveError: null,
  submitting: false,
  submitError: null,
  notice: null,
}

export function useBusinessVerificationFlow() {
  const queryClient = useQueryClient()
  const [state, setState] = useState<State>(initialState)
  const [documents, setDocuments] = useState<
    Partial<Record<BusinessVerificationDocumentType, DocumentUploadState>>
  >({})
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const patch = useCallback((next: Partial<State>) => {
    if (mounted.current) setState((previous) => ({ ...previous, ...next }))
  }, [])

  /** Invalida a leitura compartilhada; o hook de acompanhamento re-renderiza. */
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['business-verification'] })
  }, [queryClient])

  const create = useCallback(
    async (payload: CreateVerificationPayload) => {
      patch({ saving: true, saveError: null })
      try {
        const verification = await businessVerificationApi.create(payload)
        patch({ saving: false })
        refresh()
        return verification
      } catch (error) {
        patch({ saving: false, saveError: describeError(error, 'create') })
        return null
      }
    },
    [patch, refresh],
  )

  const update = useCallback(
    async (payload: UpdateVerificationPayload) => {
      patch({ saving: true, saveError: null })
      try {
        const verification = await businessVerificationApi.update(payload)
        patch({ saving: false })
        refresh()
        return verification
      } catch (error) {
        patch({ saving: false, saveError: describeError(error, 'update') })
        return null
      }
    },
    [patch, refresh],
  )

  const setDocumentPhase = useCallback(
    (
      documentType: BusinessVerificationDocumentType,
      phase: DocumentUploadState['phase'],
      fileName: string | null = null,
      error: string | null = null,
    ) => {
      if (!mounted.current) return
      setDocuments((previous) => ({ ...previous, [documentType]: { phase, fileName, error } }))
    },
    [],
  )

  const uploadDocument = useCallback(
    async (documentType: BusinessVerificationDocumentType, file: File) => {
      setDocumentPhase(documentType, 'presigned', file.name)
      try {
        const result = await uploadVerificationDocument(file, documentType, (phase) =>
          setDocumentPhase(documentType, phase, file.name),
        )
        patch({ notice: `${documentType}: documento enviado e validado.` })
        // `missingDocumentTypes`/`submittedDocumentTypes` só são confiáveis
        // depois que o backend confirma o complete.
        refresh()
        return result
      } catch (error) {
        setDocumentPhase(
          documentType,
          'error',
          file.name,
          error instanceof Error ? error.message : describeError(error, 'upload'),
        )
        return null
      }
    },
    [patch, refresh, setDocumentPhase],
  )

  const submit = useCallback(async () => {
    patch({ submitting: true, submitError: null })
    try {
      const verification = await businessVerificationApi.submit()
      patch({ submitting: false })
      refresh()
      return verification
    } catch (error) {
      patch({ submitting: false, submitError: describeError(error, 'submit') })
      return null
    }
  }, [patch, refresh])

  const cancel = useCallback(async () => {
    patch({ saving: true, saveError: null })
    try {
      const verification = await businessVerificationApi.cancel()
      patch({ saving: false, notice: 'Solicitação cancelada.' })
      refresh()
      return verification
    } catch (error) {
      patch({ saving: false, saveError: describeError(error, 'cancel') })
      return null
    }
  }, [patch, refresh])

  const anyUploadInFlight = Object.values(documents).some(
    (d) => d?.phase === 'presigned' || d?.phase === 'uploading' || d?.phase === 'uploaded',
  )

  return {
    ...state,
    documents,
    anyUploadInFlight,
    create,
    update,
    uploadDocument,
    submit,
    cancel,
    refresh,
    clearSaveError: () => patch({ saveError: null }),
    clearSubmitError: () => patch({ submitError: null }),
  }
}

/** Permissões de tela derivadas do contrato; o backend segue a autoridade. */
export function verificationPermissions(verification: import('@/types/business-verification').BusinessVerification | undefined) {
  return {
    editable: canEdit(verification?.status ?? null),
    mayUpload: canUploadDocuments(verification?.status ?? null),
    maySubmit: canSubmit(verification ?? null),
  }
}
