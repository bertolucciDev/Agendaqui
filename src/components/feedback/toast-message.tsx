export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastMessageProps {
  message: string
  action?: ToastAction
  retry?: () => void
  onDismiss?: () => void
}

const ACTION_BUTTON_CLASS =
  'inline-flex items-center rounded-md border border-border bg-transparent px-2.5 py-1 text-xs font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

/**
 * Body of a toast: the message plus optional action / retry buttons.
 * Rendered by `notify` as the toast message slot.
 */
export function ToastMessage({ message, action, retry, onDismiss }: ToastMessageProps) {
  const handleAction = () => {
    action?.onClick()
    onDismiss?.()
  }

  const handleRetry = () => {
    retry?.()
    onDismiss?.()
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 text-left">
      <span className="whitespace-normal break-words text-sm text-foreground">{message}</span>
      {(action || retry) && (
        <div className="flex flex-wrap items-center gap-2">
          {action && (
            <button type="button" onClick={handleAction} className={ACTION_BUTTON_CLASS}>
              {action.label}
            </button>
          )}
          {retry && (
            <button type="button" onClick={handleRetry} className={ACTION_BUTTON_CLASS}>
              Tentar novamente
            </button>
          )}
        </div>
      )}
    </div>
  )
}
