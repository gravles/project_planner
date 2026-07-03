import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-bg-surface border border-border rounded-xl p-8 text-center space-y-4">
          <div className="text-3xl">⚠️</div>
          <h2 className="font-display text-lg font-bold text-text-primary">Something broke</h2>
          <p className="text-sm text-text-muted break-words">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-accent hover:bg-amber-400 text-bg-base font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors"
          >
            Reload the app
          </button>
        </div>
      </div>
    )
  }
}
