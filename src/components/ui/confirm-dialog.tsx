import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

export type ConfirmDialogVariant = 'default' | 'destructive'

export interface ConfirmDialogProps {
  /** Whether the dialog is visible. */
  open: boolean
  /** Dialog title, used as the accessible name. */
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
  /** Called when the user confirms. */
  onConfirm: () => void
  /** Called when the user cancels (button, backdrop, Escape). */
  onCancel: () => void
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

/**
 * Accessible confirmation modal.
 *
 * Rendered through a portal so it escapes `overflow-hidden` ancestors, traps
 * focus while open, closes on Escape / backdrop click and restores focus to
 * the element that opened it.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const panel = panelRef.current
    if (panel) {
      const focusable = getFocusableElements(panel)
      const target = focusable[0] ?? panel
      target.focus()
    }

    return () => {
      const previous = restoreFocusRef.current
      restoreFocusRef.current = null
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
        previous.focus()
      }
    }
  }, [open])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (!loading) onCancel()
      return
    }

    if (event.key !== 'Tab') return

    const panel = panelRef.current
    if (!panel) return

    const focusable = getFocusableElements(panel)
    if (focusable.length === 0) {
      event.preventDefault()
      panel.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    if (event.shiftKey) {
      if (active === first || !panel.contains(active)) {
        event.preventDefault()
        last.focus()
      }
      return
    }

    if (active === last || !panel.contains(active)) {
      event.preventDefault()
      first.focus()
    }
  }

  const handleBackdropMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (loading) return
    if (event.target === event.currentTarget) onCancel()
  }

  if (!open || typeof document === 'undefined') return null

  const panel = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay-scrim)]"
      onMouseDown={handleBackdropMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'w-full max-w-md rounded-xl border border-border bg-surface-overlay p-5 shadow-xl animate-in-scale outline-none'
        )}
      >
        {variant === 'destructive' && (
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive-soft text-destructive-soft-fg">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
        )}

        <h2 id={titleId} className="text-base font-semibold text-foreground">
          {title}
        </h2>

        {description && (
          <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}
