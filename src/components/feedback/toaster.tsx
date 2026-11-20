import toast, { Toaster, ToastBar, type DefaultToastOptions } from 'react-hot-toast'
import { X } from 'lucide-react'
import { TOAST_BASE_CLASS, TOAST_ICONS, TOAST_VARIANT_CLASS } from './toast-theme'

/**
 * Per-type toast styling.
 *
 * `react-hot-toast` merges `toastOptions[type]` into every toast of that type,
 * so raw `toast.success(...)` calls made anywhere in the app also get the
 * themed surface, the status icon and the right duration.
 */
const toastOptions: DefaultToastOptions = {
  success: {
    icon: TOAST_ICONS.success,
    duration: 3000,
    className: `${TOAST_BASE_CLASS} ${TOAST_VARIANT_CLASS.success}`,
  },
  error: {
    icon: TOAST_ICONS.error,
    duration: 5000,
    className: `${TOAST_BASE_CLASS} ${TOAST_VARIANT_CLASS.error}`,
  },
  loading: {
    icon: TOAST_ICONS.loading,
    duration: Infinity,
    className: `${TOAST_BASE_CLASS} ${TOAST_VARIANT_CLASS.loading}`,
  },
  blank: {
    duration: 4000,
    className: `${TOAST_BASE_CLASS} ${TOAST_VARIANT_CLASS.info}`,
  },
}

/**
 * Application toaster.
 *
 * Uses the app design tokens (`--surface-overlay`, `--border`, `--fg`, ...) so
 * it renders correctly in both light and dark mode, and renders a close button
 * on every toast. `ToastBar` is kept in place so `react-hot-toast` keeps
 * owning the enter/exit animations and the `aria-live` semantics.
 */
export function AppToaster() {
  return (
    <Toaster position="top-right" toastOptions={toastOptions}>
      {(t) => (
        <ToastBar toast={t} position={t.position ?? 'top-right'}>
          {({ icon, message }) => (
            <>
              {icon}
              {message}
              <button
                type="button"
                aria-label="Fechar notificação"
                onClick={() => toast.dismiss(t.id)}
                className="ml-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  )
}
