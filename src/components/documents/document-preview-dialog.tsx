import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Download, ExternalLink, FileText, Loader2, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { adminApi } from '@/services/api/admin'
import { getApiErrorMessage } from '@/lib/api-error'

export interface DocumentPreviewDialogProps {
  /** Visibility of the modal. */
  open: boolean
  /** Rota do conteúdo, exatamente como o back-end devolve (`contentUrl`). */
  contentUrl: string | null
  /** Tipo do documento — usado como título acessível. */
  title: string
  /** MIME do documento; decide se o preview é `<img>` ou `<iframe>`. */
  mimeType?: string
  /** Tamanho em bytes, exibido no cabeçalho. */
  sizeBytes?: number
  /** Nome sugerido no download. */
  fileName?: string
  /** Called on close (button, backdrop, Escape). */
  onClose: () => void
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

type PreviewState = {
  loading: boolean
  error: string | null
  objectUrl: string | null
}

const INITIAL_STATE: PreviewState = { loading: false, error: null, objectUrl: null }

/**
 * Preview de documento em modal.
 *
 * O conteúdo é buscado via axios (e não por `<a href>`) por dois motivos:
 * a navegação do browser não carrega o header `Authorization`, e o
 * `contentUrl` do back-end é um caminho relativo — resolvido contra a origem
 * do front ele cairia na rota catch-all do React Router e voltaria para a
 * landing page.
 *
 * O objeto em memória é revogado ao fechar (ou ao trocar de documento), para
 * não vazar Blob URLs.
 */
export function DocumentPreviewDialog({
  open,
  contentUrl,
  title,
  mimeType,
  sizeBytes,
  fileName,
  onClose,
}: DocumentPreviewDialogProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const [state, setState] = useState<PreviewState>(INITIAL_STATE)
  const [attempt, setAttempt] = useState(0)

  // Busca o blob e cria a object URL. Recomeça quando o documento muda ou
  // quando o usuário pede nova tentativa.
  useEffect(() => {
    if (!open || !contentUrl) {
      setState(INITIAL_STATE)
      return
    }

    const controller = new AbortController()
    let objectUrl: string | null = null

    setState({ loading: true, error: null, objectUrl: null })

    adminApi
      .getDocumentContent(contentUrl, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setState({ loading: false, error: null, objectUrl })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          loading: false,
          error: getApiErrorMessage(error, 'Não foi possível carregar o documento.'),
          objectUrl: null,
        })
      })

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, contentUrl, attempt])

  // Foco: entra no painel ao abrir e volta ao elemento de origem ao fechar.
  useEffect(() => {
    if (!open) return

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const panel = panelRef.current
    if (panel) {
      const focusable = getFocusableElements(panel)
      ;(focusable[0] ?? panel).focus()
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
      onClose()
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
    if (event.target === event.currentTarget) onClose()
  }

  if (!open || typeof document === 'undefined') return null

  const isImage = mimeType?.startsWith('image/') ?? false
  const isPdf = mimeType === 'application/pdf'
  const sizeLabel = sizeBytes ? `${(sizeBytes / 1024).toFixed(0)} KB` : null

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
        tabIndex={-1}
        className={cn(
          'flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-surface-overlay shadow-xl animate-in-scale outline-none',
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-base font-semibold text-foreground">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[mimeType, sizeLabel].filter(Boolean).join(' • ')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar preview"
            className="btn-ghost !p-1.5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto bg-surface-sunken p-4">
          {state.loading && (
            <div className="flex h-full min-h-[18rem] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!state.loading && state.error && (
            <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="max-w-sm text-sm text-muted-foreground">{state.error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttempt((n) => n + 1)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          )}

          {!state.loading && !state.error && state.objectUrl && (
            isImage ? (
              <img
                src={state.objectUrl}
                alt={title}
                className="mx-auto block max-h-[70vh] w-auto rounded-lg object-contain shadow-sm"
              />
            ) : isPdf ? (
              <iframe
                src={state.objectUrl}
                title={title}
                className="h-[70vh] w-full rounded-lg border border-border bg-white"
              />
            ) : (
              <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Não há preview para este tipo de arquivo.
                </p>
                <a
                  href={state.objectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Abrir em nova aba
                </a>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
          {state.objectUrl && (
            <>
              <a
                href={state.objectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Nova aba
              </a>
              <a
                href={state.objectUrl}
                download={fileName}
                className="btn-outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </a>
            </>
          )}
          <Button variant="primary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}
