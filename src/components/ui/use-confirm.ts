import { createElement, useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { ConfirmDialog, type ConfirmDialogVariant } from './confirm-dialog'

export interface ConfirmOptions {
  /** Dialog title. */
  title: string
  /** Optional supporting copy. */
  description?: string
  /** Label of the confirm button. Defaults to "Confirmar". */
  confirmLabel?: string
  /** Label of the cancel button. Defaults to "Cancelar". */
  cancelLabel?: string
  /** Visual variant of the confirm button. */
  variant?: ConfirmDialogVariant
  /** Disables the actions and shows a spinner on the confirm button. */
  loading?: boolean
}

export interface UseConfirmResult {
  /** Opens the dialog and resolves to `true` when confirmed, `false` otherwise. */
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** The dialog element — render it once, where the consumer wants it. */
  confirmDialog: ReactElement
}

interface ConfirmState {
  options: ConfirmOptions
  resolve: (result: boolean) => void
}

/**
 * Imperative confirmation dialog.
 *
 * ```tsx
 * const { confirm, confirmDialog } = useConfirm()
 *
 * const onDelete = async () => {
 *   const ok = await confirm({
 *     title: 'Remover serviço?',
 *     description: 'Esta ação não pode ser desfeita.',
 *     variant: 'destructive',
 *   })
 *   if (!ok) return
 *   await removeService()
 * }
 *
 * return (
 *   <>
 *     <Button onClick={onDelete}>Remover</Button>
 *     {confirmDialog}
 *   </>
 * )
 * ```
 */
export function useConfirm(): UseConfirmResult {
  const [state, setState] = useState<ConfirmState | null>(null)
  const stateRef = useRef<ConfirmState | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    return () => {
      stateRef.current?.resolve(false)
    }
  }, [])

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        // A confirmation already open is dismissed with a negative answer.
        state?.resolve(false)
        setState({ options, resolve })
      })
    },
    [state]
  )

  const settle = useCallback(
    (result: boolean) => {
      state?.resolve(result)
      setState(null)
    },
    [state]
  )

  const confirmDialog = createElement(ConfirmDialog, {
    open: state !== null,
    title: state?.options.title ?? '',
    description: state?.options.description,
    confirmLabel: state?.options.confirmLabel,
    cancelLabel: state?.options.cancelLabel,
    variant: state?.options.variant,
    loading: state?.options.loading,
    onConfirm: () => settle(true),
    onCancel: () => settle(false),
  })

  return { confirm, confirmDialog }
}
