import { Component, type ErrorInfo, type ReactNode } from 'react'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  error: Error | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Fieldnote crashed before React could recover.', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="app-error-shell" role="alert">
        <section className="app-error-card" aria-labelledby="app-error-title">
          <p className="app-error-eyebrow">Fieldnote</p>
          <h1 id="app-error-title">The workspace hit a display problem.</h1>
          <p>
            Reloading usually brings your project back. Fieldnote saves to Supabase and keeps a browser recovery copy while
            you work, so this screen is here to avoid a blank page.
          </p>
          <div className="app-error-actions">
            <button type="button" onClick={() => window.location.reload()}>
              Reload Fieldnote
            </button>
          </div>
          {import.meta.env.DEV ? (
            <pre className="app-error-detail">{this.state.error.message}</pre>
          ) : null}
        </section>
      </main>
    )
  }
}
