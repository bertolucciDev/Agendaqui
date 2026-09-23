import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-warm p-6">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-peach-100">
              <AlertTriangle className="h-8 w-8 text-peach-400" />
            </div>
            <h1 className="mt-6 text-xl font-bold text-ink">Algo deu errado</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            {this.state.error && (
              <p className="mt-3 rounded-lg bg-warm-100 p-3 text-xs text-ink-faint font-mono">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-6"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
